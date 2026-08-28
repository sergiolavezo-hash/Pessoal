-- ============================================================================
-- ATLAS INSIGHT AI — SCRIPT ÚNICO DAS MIGRAÇÕES PENDENTES
--
-- Conferido contra o banco de produção em 2026-08-28:
--   0001–0011 .... JÁ APLICADAS (nada a fazer)
--   0012 ......... PENDENTE — créditos de IA, cota diária e recarga
--   0013 ......... PENDENTE — índices de performance
--
-- COMO RODAR (uma vez só):
--   1. Supabase → SQL Editor → New query
--   2. Cole este arquivo INTEIRO
--   3. Clique dentro do texto SEM SELECIONAR NADA e aperte Ctrl+Enter
--      (o editor executa apenas o trecho selecionado, se houver seleção)
--   4. Deve terminar com "Success"
--
-- É seguro rodar mais de uma vez: tudo usa "if not exists" / "or replace".
-- ============================================================================


-- ############################################################################
-- # PARTE 1 de 2 — MIGRAÇÃO 0012: CRÉDITOS DE IA
-- ############################################################################

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


-- ############################################################################
-- # PARTE 2 de 2 — MIGRAÇÃO 0013: ÍNDICES DE PERFORMANCE
-- ############################################################################

-- ============================================================================
-- Atlas Insight AI — 0013 Índices de performance
--
-- Baseado na auditoria dos índices REAIS em produção (pg_indexes) cruzada com
-- os filtros que a aplicação de fato executa. Nenhum índice aqui é
-- especulativo: cada um atende uma consulta existente.
--
-- Observação: em bases já grandes, prefira rodar cada CREATE INDEX com
-- CONCURRENTLY fora de transação. O editor SQL roda tudo numa transação só,
-- onde CONCURRENTLY não é permitido; com o volume atual isso é irrelevante.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 🔴 Tabelas SEM índice na coluna que filtram (varredura sequencial hoje)
-- ----------------------------------------------------------------------------

-- Tabela: workspace_files
-- Consulta: lista de arquivos (.eq workspace_id .order created_at desc)
-- Problema: só existia o índice da chave primária — varredura completa.
create index if not exists idx_workspace_files_ws
  on public.workspace_files (workspace_id, created_at desc);

-- Tabela: business_rules
-- Consulta: contexto da IA (.eq workspace_id .eq status='ACTIVE')
-- Problema: lido em TODA chamada de IA, sem índice.
create index if not exists idx_business_rules_ws_status
  on public.business_rules (workspace_id, status);

-- Tabela: ai_conversations
-- Consulta: histórico do analista (.eq workspace_id .order updated_at desc)
create index if not exists idx_ai_conversations_ws
  on public.ai_conversations (workspace_id, updated_at desc);

-- Tabela: business_documents
-- Consulta: documentos do workspace (.eq workspace_id)
create index if not exists idx_business_documents_ws
  on public.business_documents (workspace_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 🟠 Índice existia, mas não cobria o filtro nem a ordenação
-- ----------------------------------------------------------------------------

-- Tabela: dashboards
-- Consulta: .eq(workspace_id).is(deleted_at,null).order(updated_at desc)
-- Problema: o índice (workspace_id) obrigava a reler e ordenar tudo.
-- Índice parcial: só as linhas vivas, já na ordem apresentada.
create index if not exists idx_dashboards_ws_updated_live
  on public.dashboards (workspace_id, updated_at desc)
  where deleted_at is null;

-- Tabela: data_sources
-- Consulta: .eq(workspace_id).is(deleted_at,null).order(created_at)
create index if not exists idx_data_sources_ws_created_live
  on public.data_sources (workspace_id, created_at)
  where deleted_at is null;

-- Tabela: semantic_models
-- Consulta: .eq(workspace_id).eq(status,'ACTIVE').order(version desc)
-- Problema: o índice (workspace_id) não sabia de status nem de version.
create index if not exists idx_semantic_models_ws_active
  on public.semantic_models (workspace_id, version desc)
  where status = 'ACTIVE';

-- Tabela: metrics
-- Consulta: .eq(workspace_id).is(deleted_at,null).neq(status,'DEPRECATED')
-- O índice único (workspace_id, slug) serve o filtro, mas carrega as
-- excluídas; o parcial mantém apenas o que a aplicação lê.
create index if not exists idx_metrics_ws_live
  on public.metrics (workspace_id)
  where deleted_at is null;

-- ----------------------------------------------------------------------------
-- 🟡 Índices redundantes: o composto já atende, e cada índice extra custa
--    em todo INSERT/UPDATE/DELETE
-- ----------------------------------------------------------------------------

-- catalog_columns (table_id) é prefixo de UNIQUE (table_id, name).
drop index if exists public.idx_catalog_columns_table;

-- organization_members (organization_id) é prefixo de
-- UNIQUE (organization_id, user_id).
drop index if exists public.idx_org_members_org;

-- ----------------------------------------------------------------------------
-- Estatísticas: sem ANALYZE o planejador decide no escuro logo após a criação
-- ----------------------------------------------------------------------------
analyze public.workspace_files;
analyze public.business_rules;
analyze public.ai_conversations;
analyze public.dashboards;
analyze public.data_sources;
analyze public.semantic_models;
analyze public.metrics;
analyze public.catalog_columns;
analyze public.catalog_tables;


-- ============================================================================
-- CONFERÊNCIA (opcional): rode depois, deve devolver 3 tabelas, 4 funções
-- e 8 índices novos.
-- ============================================================================
-- select table_name from information_schema.tables
--  where table_schema='public'
--    and table_name in ('ai_credit_wallets','ai_credit_transactions','ai_suggestion_cache');
--
-- select routine_name from information_schema.routines
--  where routine_schema='public'
--    and routine_name in ('ai_credits_status','ai_credits_consume','ai_credits_add','ensure_ai_wallet');
--
-- select indexname from pg_indexes
--  where schemaname='public' and indexname like 'idx_%'
--    and indexname in ('idx_workspace_files_ws','idx_business_rules_ws_status',
--                      'idx_ai_conversations_ws','idx_business_documents_ws',
--                      'idx_dashboards_ws_updated_live','idx_data_sources_ws_created_live',
--                      'idx_semantic_models_ws_active','idx_metrics_ws_live');
