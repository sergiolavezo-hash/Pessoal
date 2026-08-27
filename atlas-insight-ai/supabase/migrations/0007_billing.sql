-- ============================================================================
-- Atlas Insight AI — 0007 Billing
-- Extends the decoupled billing tables from 0004 with the commercial model:
--   * plan catalog (monthly/yearly BRL pricing)
--   * free trial = 14 days OR 1 dashboard run, whichever ends first
--   * immutable payment transaction history
--   * atomic trial gating functions exposed as RPCs
-- Stripe checkout/webhooks plug into these tables via the service role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Plan catalog
-- ----------------------------------------------------------------------------
create table if not exists public.billing_plans (
  id text primary key,                        -- 'free' | 'pro' | 'business'
  name text not null,
  tier text not null check (tier in ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE')),
  price_monthly_cents integer,                -- null = contact sales
  price_yearly_cents integer,
  currency text not null default 'BRL',
  external_price_monthly text,                -- Stripe price id
  external_price_yearly text,
  trial_days integer not null default 14,
  trial_dashboard_runs integer not null default 1,
  limits jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.billing_plans
  (id, name, tier, price_monthly_cents, price_yearly_cents, trial_days, trial_dashboard_runs, limits)
values
  ('free', 'Gratuito', 'FREE', 0, 0, 14, 1,
    '{"data_sources":1,"dashboards":1,"seats":2,"ai_requests_month":20}'),
  ('pro', 'Pro', 'PRO', 49700, 497000, 14, 1,
    '{"data_sources":5,"dashboards":20,"seats":10,"ai_requests_month":1000}'),
  ('business', 'Business', 'BUSINESS', null, null, 14, 1,
    '{"data_sources":-1,"dashboards":-1,"seats":-1,"ai_requests_month":-1}')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Subscriptions: trial + billing interval columns
-- ----------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists plan_id text references public.billing_plans (id) default 'free',
  add column if not exists billing_interval text check (billing_interval in ('monthly', 'yearly')),
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists trial_ends_at timestamptz not null default now() + interval '14 days',
  add column if not exists trial_dashboard_runs_used integer not null default 0,
  add column if not exists trial_dashboard_runs_limit integer not null default 1,
  add column if not exists current_period_start timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz;

-- Wider lifecycle: incomplete (checkout started) and expired (trial over).
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'expired'));
alter table public.subscriptions alter column status set default 'trialing';

-- ----------------------------------------------------------------------------
-- Payment transactions (immutable purchase history)
-- ----------------------------------------------------------------------------
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'BRL',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  description text,
  external_invoice_id text unique,
  external_payment_intent_id text unique,
  invoice_url text,
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_payment_tx_org on public.payment_transactions (organization_id, created_at desc);

alter table public.payment_transactions enable row level security;
drop policy if exists payment_tx_select on public.payment_transactions;
create policy payment_tx_select on public.payment_transactions for select
  using (app.has_org_role(organization_id, 'ADMIN'));
-- writes: service role only (Stripe webhooks) — no client policies.

-- ----------------------------------------------------------------------------
-- Usage events: dashboard_run event type
-- ----------------------------------------------------------------------------
alter table public.usage_events drop constraint if exists usage_events_event_type_check;
alter table public.usage_events add constraint usage_events_event_type_check
  check (event_type in (
    'ai_request', 'ai_tokens', 'query_execution', 'data_source_created',
    'dashboard_created', 'dashboard_run', 'file_uploaded', 'storage_bytes'
  ));

-- ----------------------------------------------------------------------------
-- Auto-create a trial subscription for every organization
-- ----------------------------------------------------------------------------
create or replace function app.handle_new_organization()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  p public.billing_plans;
begin
  select * into p from public.billing_plans where id = 'free';
  insert into public.subscriptions (
    organization_id, plan, plan_id, status, trial_ends_at, trial_dashboard_runs_limit
  ) values (
    new.id, 'FREE', 'free', 'trialing',
    now() + make_interval(days => coalesce(p.trial_days, 14)),
    coalesce(p.trial_dashboard_runs, 1)
  )
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_organization_created_billing on public.organizations;
create trigger on_organization_created_billing
  after insert on public.organizations
  for each row execute function app.handle_new_organization();

-- Backfill: organizations created before this migration start their trial now.
insert into public.subscriptions (organization_id, plan, plan_id, status)
select o.id, 'FREE', 'free', 'trialing'
from public.organizations o
where not exists (select 1 from public.subscriptions s where s.organization_id = o.id);

-- ----------------------------------------------------------------------------
-- Trial gating RPCs (public schema so PostgREST exposes them)
-- Product rule: the free version lasts 14 days OR 1 dashboard run —
-- whichever ends first closes the trial.
-- ----------------------------------------------------------------------------
create or replace function public.can_run_dashboard(org uuid)
returns jsonb
language plpgsql stable
security definer set search_path = public
as $$
declare
  s public.subscriptions;
begin
  if not app.is_org_member(org) then
    return jsonb_build_object('allowed', false, 'view_allowed', false, 'reason', 'not_a_member');
  end if;

  select * into s from public.subscriptions where organization_id = org;
  if s is null then
    return jsonb_build_object('allowed', false, 'view_allowed', false, 'reason', 'no_subscription');
  end if;

  if s.status = 'active' then
    return jsonb_build_object('allowed', true, 'view_allowed', true, 'reason', 'active_subscription');
  end if;

  if s.status = 'trialing' then
    if now() > s.trial_ends_at then
      return jsonb_build_object('allowed', false, 'view_allowed', false, 'reason', 'trial_time_expired');
    end if;
    if s.trial_dashboard_runs_used >= s.trial_dashboard_runs_limit then
      -- Within trial time but runs exhausted: existing dashboards remain
      -- viewable until the time gate closes; new runs require a paid plan.
      return jsonb_build_object('allowed', false, 'view_allowed', true, 'reason', 'trial_runs_exhausted');
    end if;
    return jsonb_build_object(
      'allowed', true, 'view_allowed', true, 'reason', 'trialing',
      'runs_remaining', s.trial_dashboard_runs_limit - s.trial_dashboard_runs_used,
      'trial_ends_at', s.trial_ends_at
    );
  end if;

  return jsonb_build_object('allowed', false, 'view_allowed', false, 'reason', s.status);
end;
$$;

create or replace function public.consume_dashboard_run(ws uuid, dash text default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  org uuid;
  verdict jsonb;
begin
  select w.organization_id into org from public.workspaces w where w.id = ws;
  if org is null then
    return jsonb_build_object('allowed', false, 'reason', 'workspace_not_found');
  end if;

  verdict := public.can_run_dashboard(org);
  if not (verdict ->> 'allowed')::boolean then
    return verdict;
  end if;

  update public.subscriptions
  set trial_dashboard_runs_used = trial_dashboard_runs_used + 1, updated_at = now()
  where organization_id = org and status = 'trialing';

  insert into public.usage_events (organization_id, workspace_id, user_id, event_type, metadata)
  values (org, ws, auth.uid(), 'dashboard_run',
          jsonb_build_object('dashboard_id', dash));

  return verdict;
end;
$$;

revoke all on function public.can_run_dashboard(uuid) from public;
revoke all on function public.consume_dashboard_run(uuid, text) from public;
grant execute on function public.can_run_dashboard(uuid) to authenticated;
grant execute on function public.consume_dashboard_run(uuid, text) to authenticated;

-- Plan catalog is readable by any authenticated user.
alter table public.billing_plans enable row level security;
drop policy if exists billing_plans_select on public.billing_plans;
create policy billing_plans_select on public.billing_plans for select
  using (auth.uid() is not null and active);
