-- =====================================================================
-- Atlas Insight AI — 0003_billing
-- Assinaturas (mensal/anual), trial (14 dias OU 1 execução de dashboard),
-- transações de compra e eventos de uso para medição/gating.
-- =====================================================================

-- ---------- Enums ----------
create type public.billing_interval as enum ('MONTHLY', 'YEARLY');
create type public.subscription_status as enum (
  'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'EXPIRED'
);
create type public.payment_status as enum (
  'PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'
);
create type public.usage_event_kind as enum (
  'DASHBOARD_RUN', 'AI_QUERY', 'CONNECTOR_SYNC', 'FILE_UPLOAD', 'SEAT'
);

-- ---------- Planos (catálogo gerido pelo serviço, legível por todos autenticados) ----------
create table public.billing_plans (
  id text primary key,                    -- 'free' | 'pro' | 'business'
  name text not null,
  tier public.plan_tier not null,
  price_monthly_cents integer,            -- null = sob consulta
  price_yearly_cents integer,
  currency text not null default 'BRL',
  stripe_price_monthly text,
  stripe_price_yearly text,
  trial_days integer not null default 14,
  trial_dashboard_runs integer not null default 1,  -- "uma vez pra rodar o painel"
  limits jsonb not null default '{}'::jsonb,        -- ex.: {"data_sources":1,"dashboards":1,"seats":2}
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.billing_plans
  (id, name, tier, price_monthly_cents, price_yearly_cents, trial_days, trial_dashboard_runs, limits)
values
  ('free', 'Gratuito', 'FREE', 0, 0, 14, 1,
    '{"data_sources":1,"dashboards":1,"seats":2,"ai_queries_month":20}'),
  ('pro', 'Pro', 'PRO', 49700, 497000, 14, 1,
    '{"data_sources":5,"dashboards":20,"seats":10,"ai_queries_month":1000}'),
  ('business', 'Business', 'BUSINESS', null, null, 14, 1,
    '{"data_sources":-1,"dashboards":-1,"seats":-1,"ai_queries_month":-1}');

-- ---------- Assinatura por organização ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan_id text not null references public.billing_plans (id),
  status public.subscription_status not null default 'TRIALING',
  billing_interval public.billing_interval,
  -- Trial: expira por tempo OU por consumo de execuções de dashboard.
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default now() + interval '14 days',
  trial_dashboard_runs_used integer not null default 0,
  trial_dashboard_runs_limit integer not null default 1,
  -- Stripe
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_subscriptions_status on public.subscriptions (status);
create trigger trg_subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ---------- Transações de compra (histórico imutável de pagamentos) ----------
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'BRL',
  status public.payment_status not null default 'PENDING',
  description text,
  stripe_invoice_id text unique,
  stripe_payment_intent_id text unique,
  invoice_url text,
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_payments_org_time on public.payment_transactions (organization_id, created_at desc);

-- ---------- Eventos de uso (gating + medição) ----------
create table public.usage_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  kind public.usage_event_kind not null,
  quantity integer not null default 1,
  resource_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_usage_org_kind_time on public.usage_events (organization_id, kind, created_at desc);

-- ---------- Trigger: assinatura trial automática ao criar organização ----------
create or replace function public.handle_new_organization()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  select * into p from public.billing_plans where id = 'free';
  insert into public.subscriptions (
    organization_id, plan_id, status,
    trial_ends_at, trial_dashboard_runs_limit
  ) values (
    new.id, 'free', 'TRIALING',
    now() + make_interval(days => coalesce(p.trial_days, 14)),
    coalesce(p.trial_dashboard_runs, 1)
  )
  on conflict (organization_id) do nothing;
  return new;
end;
$$;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- ---------- Gating: a organização pode executar um dashboard agora? ----------
-- Regra do produto: versão gratuita vale por tempo (trial_days) OU por
-- uma execução de painel — o que acabar primeiro encerra o trial.
create or replace function public.can_run_dashboard(org uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s record;
begin
  if not public.is_org_member(org) then
    return jsonb_build_object('allowed', false, 'reason', 'not_a_member');
  end if;

  select * into s from public.subscriptions where organization_id = org;
  if s is null then
    return jsonb_build_object('allowed', false, 'reason', 'no_subscription');
  end if;

  if s.status = 'ACTIVE' then
    return jsonb_build_object('allowed', true, 'reason', 'active_subscription');
  end if;

  if s.status = 'TRIALING' then
    if now() > s.trial_ends_at then
      return jsonb_build_object('allowed', false, 'reason', 'trial_time_expired');
    end if;
    if s.trial_dashboard_runs_used >= s.trial_dashboard_runs_limit then
      return jsonb_build_object('allowed', false, 'reason', 'trial_runs_exhausted');
    end if;
    return jsonb_build_object(
      'allowed', true, 'reason', 'trialing',
      'runs_remaining', s.trial_dashboard_runs_limit - s.trial_dashboard_runs_used,
      'trial_ends_at', s.trial_ends_at
    );
  end if;

  return jsonb_build_object('allowed', false, 'reason', lower(s.status::text));
end;
$$;

-- ---------- Consumo: registra uma execução de dashboard (atômico) ----------
create or replace function public.consume_dashboard_run(org uuid, ws uuid, dash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  verdict jsonb;
begin
  verdict := public.can_run_dashboard(org);
  if not (verdict ->> 'allowed')::boolean then
    return verdict;
  end if;

  update public.subscriptions
  set trial_dashboard_runs_used = trial_dashboard_runs_used + 1
  where organization_id = org and status = 'TRIALING';

  insert into public.usage_events (organization_id, workspace_id, user_id, kind, resource_id)
  values (org, ws, auth.uid(), 'DASHBOARD_RUN', dash);

  return verdict;
end;
$$;

-- ---------- RLS ----------
alter table public.billing_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.usage_events enable row level security;

-- Catálogo de planos: leitura para qualquer usuário autenticado
create policy plans_select on public.billing_plans
  for select using (auth.uid() is not null and active);

-- Assinatura: membros leem; escrita apenas via service role (webhooks Stripe)
create policy subs_select on public.subscriptions
  for select using (public.is_org_member(organization_id));

-- Transações: ADMIN+ lê o histórico financeiro; escrita apenas service role
create policy payments_select on public.payment_transactions
  for select using (public.has_org_role(organization_id, 'ADMIN'));

-- Uso: membros leem; inserção via funções SECURITY DEFINER / service role
create policy usage_select on public.usage_events
  for select using (public.is_org_member(organization_id));
