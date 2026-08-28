-- ============================================================================
-- Atlas Insight AI — 0012 Créditos de IA
-- Cada organização tem uma cota diária incluída no plano e um saldo de
-- créditos comprados. O consumo é debitado por execução de IA, ao custo real
-- do provedor multiplicado pela margem da Atlas. Quando a cota diária acaba,
-- o saldo comprado assume; quando ambos acabam, o usuário recarrega sozinho.
-- Todo débito e crédito fica registrado para auditoria e conciliação.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Custo real por execução de IA (para margem e diagnóstico)
-- ----------------------------------------------------------------------------
alter table public.ai_runs
  add column if not exists provider_cost_usd numeric(12, 6),
  add column if not exists charged_cents integer;

-- ----------------------------------------------------------------------------
-- Carteira: uma por organização
-- ----------------------------------------------------------------------------
create table if not exists public.ai_credit_wallets (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  -- Saldo comprado, em centavos de real. Nunca negativo.
  balance_cents integer not null default 0 check (balance_cents >= 0),
  -- Franquia diária incluída no plano, reposta a cada dia.
  daily_allowance_cents integer not null default 200 check (daily_allowance_cents >= 0),
  -- Dia corrente e quanto já foi gasto da franquia nele.
  day_key date not null default current_date,
  day_spent_cents integer not null default 0 check (day_spent_cents >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_credit_wallets enable row level security;

drop policy if exists ai_credit_wallets_read on public.ai_credit_wallets;
create policy ai_credit_wallets_read on public.ai_credit_wallets
  for select using (app.is_org_member(organization_id));

-- Escrita só pelo service role (via RPCs abaixo): saldo não se edita pelo cliente.

-- ----------------------------------------------------------------------------
-- Extrato: cada débito de uso e cada recarga
-- ----------------------------------------------------------------------------
create table if not exists public.ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('usage', 'purchase', 'grant', 'refund', 'adjustment')),
  -- Negativo para consumo, positivo para entrada.
  amount_cents integer not null,
  -- De onde saiu: franquia diária ou saldo comprado (só para 'usage').
  source text check (source in ('daily_allowance', 'balance', 'mixed')),
  ai_run_id uuid references public.ai_runs (id) on delete set null,
  external_reference text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_credit_transactions_org_idx
  on public.ai_credit_transactions (organization_id, created_at desc);
-- Recarga idempotente: o mesmo pagamento nunca credita duas vezes.
create unique index if not exists ai_credit_transactions_external_idx
  on public.ai_credit_transactions (external_reference)
  where external_reference is not null;

alter table public.ai_credit_transactions enable row level security;

drop policy if exists ai_credit_transactions_read on public.ai_credit_transactions;
create policy ai_credit_transactions_read on public.ai_credit_transactions
  for select using (app.is_org_member(organization_id));

-- ----------------------------------------------------------------------------
-- Garante a carteira e vira o dia quando necessário
-- ----------------------------------------------------------------------------
create or replace function public.ensure_ai_wallet(org uuid)
returns public.ai_credit_wallets
language plpgsql
security definer
set search_path = public, app
as $$
declare
  w public.ai_credit_wallets;
  allowance integer;
begin
  insert into public.ai_credit_wallets (organization_id)
  values (org)
  on conflict (organization_id) do nothing;

  -- A franquia diária vem do plano contratado; planos ENTERPRISE não têm
  -- teto prático. Ressincronizar aqui faz upgrades valerem no mesmo dia.
  select coalesce(
           case when s.plan = 'ENTERPRISE' then 1000000 end,
           (p.limits ->> 'daily_ai_cents')::integer,
           200
         )
    into allowance
    from public.subscriptions s
    left join public.billing_plans p on p.id = s.plan_id
   where s.organization_id = org;

  update public.ai_credit_wallets
     set daily_allowance_cents = coalesce(allowance, 200),
         updated_at = now()
   where organization_id = org
     and daily_allowance_cents is distinct from coalesce(allowance, 200);

  -- Vira o dia: a franquia diária volta ao zero de gasto.
  update public.ai_credit_wallets
     set day_key = current_date,
         day_spent_cents = 0,
         updated_at = now()
   where organization_id = org
     and day_key <> current_date;

  select * into w from public.ai_credit_wallets where organization_id = org;
  return w;
end;
$$;

-- ----------------------------------------------------------------------------
-- Consulta: quanto ainda dá para gastar hoje
-- ----------------------------------------------------------------------------
create or replace function public.ai_credits_status(org uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
declare
  w public.ai_credit_wallets;
  day_left integer;
begin
  w := public.ensure_ai_wallet(org);
  day_left := greatest(w.daily_allowance_cents - w.day_spent_cents, 0);
  return jsonb_build_object(
    'allowed', (day_left + w.balance_cents) > 0,
    'daily_allowance_cents', w.daily_allowance_cents,
    'daily_remaining_cents', day_left,
    'balance_cents', w.balance_cents,
    'total_available_cents', day_left + w.balance_cents,
    'day_spent_cents', w.day_spent_cents
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Débito atômico: gasta a franquia do dia primeiro, depois o saldo comprado
-- ----------------------------------------------------------------------------
create or replace function public.ai_credits_consume(
  org uuid,
  cents integer,
  run uuid default null,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
declare
  w public.ai_credit_wallets;
  day_left integer;
  from_day integer;
  from_balance integer;
  src text;
begin
  if cents is null or cents <= 0 then
    return public.ai_credits_status(org);
  end if;

  perform public.ensure_ai_wallet(org);

  -- Trava a linha: dois pedidos simultâneos não gastam o mesmo saldo.
  select * into w from public.ai_credit_wallets
   where organization_id = org
   for update;

  day_left := greatest(w.daily_allowance_cents - w.day_spent_cents, 0);
  from_day := least(day_left, cents);
  from_balance := least(w.balance_cents, cents - from_day);

  src := case
    when from_day > 0 and from_balance > 0 then 'mixed'
    when from_balance > 0 then 'balance'
    else 'daily_allowance'
  end;

  update public.ai_credit_wallets
     set day_spent_cents = day_spent_cents + from_day,
         balance_cents = balance_cents - from_balance,
         updated_at = now()
   where organization_id = org;

  if (from_day + from_balance) > 0 then
    insert into public.ai_credit_transactions
      (organization_id, kind, amount_cents, source, ai_run_id, description)
    values
      (org, 'usage', -(from_day + from_balance), src, run, note);
  end if;

  return public.ai_credits_status(org);
end;
$$;

-- ----------------------------------------------------------------------------
-- Recarga (compra aprovada, cortesia ou ajuste). Idempotente por referência.
-- ----------------------------------------------------------------------------
create or replace function public.ai_credits_add(
  org uuid,
  cents integer,
  entry_kind text default 'purchase',
  reference text default null,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if cents is null or cents <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  perform public.ensure_ai_wallet(org);

  -- Mesmo pagamento reprocessado (webhook repetido) não credita de novo.
  if reference is not null and exists (
    select 1 from public.ai_credit_transactions where external_reference = reference
  ) then
    return public.ai_credits_status(org);
  end if;

  update public.ai_credit_wallets
     set balance_cents = balance_cents + cents,
         updated_at = now()
   where organization_id = org;

  insert into public.ai_credit_transactions
    (organization_id, kind, amount_cents, external_reference, description)
  values
    (org, entry_kind, cents, reference, note);

  return public.ai_credits_status(org);
end;
$$;

revoke execute on function public.ensure_ai_wallet(uuid) from public, anon;
revoke execute on function public.ai_credits_consume(uuid, integer, uuid, text) from public, anon, authenticated;
revoke execute on function public.ai_credits_add(uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.ai_credits_status(uuid) to authenticated;
grant execute on function public.ai_credits_consume(uuid, integer, uuid, text) to service_role;
grant execute on function public.ai_credits_add(uuid, integer, text, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- Franquia diária por plano (o dono da Atlas fica ilimitado na prática)
-- ----------------------------------------------------------------------------
update public.billing_plans set limits = limits || '{"daily_ai_cents": 100}'::jsonb  where id = 'free';
update public.billing_plans set limits = limits || '{"daily_ai_cents": 500}'::jsonb  where id = 'pro';
update public.billing_plans set limits = limits || '{"daily_ai_cents": 5000}'::jsonb where id = 'business';

-- ----------------------------------------------------------------------------
-- Cache de sugestões de prompt
-- A sugestão depende apenas do esquema; o seletor da tela a pede a cada troca.
-- Guardar a resposta por hash do contexto elimina esse gasto repetido.
-- ----------------------------------------------------------------------------
create table if not exists public.ai_suggestion_cache (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  cache_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, cache_key)
);

-- Mesmas políticas por workspace usadas nas demais tabelas do produto.
select app.apply_workspace_policies('ai_suggestion_cache');
