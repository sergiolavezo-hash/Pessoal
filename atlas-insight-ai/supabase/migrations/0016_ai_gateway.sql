-- ============================================================================
-- Atlas Insight AI — 0016 AI Gateway: isolamento de consumo entre clientes
--
-- A camada gratuita dos provedores tem teto por CHAVE de API, não por cliente:
-- na Groq são 200.000 tokens e 1.000 requisições por dia para o projeto
-- inteiro. Sem um limite por organização, um único cliente esgota a cota e
-- derruba todos os outros — o oposto do que um SaaS multi-tenant precisa.
--
-- Esta migração cria o que falta para isolar:
--   * contador de requisições por minuto e de tokens por dia, por organização;
--   * leases de concorrência com validade, para limitar chamadas simultâneas
--     sem travar a conta quando um pedido morre no meio;
--   * cache de respostas de IA, isolado por workspace.
--
-- Toda a aritmética fica no banco para ser atômica: dois pedidos simultâneos
-- do mesmo cliente não podem ler o mesmo contador antes de incrementá-lo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Contadores de consumo por organização
-- ----------------------------------------------------------------------------
create table if not exists public.ai_tenant_usage (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  -- Janela de um minuto para o limite de requisições.
  minute_key timestamptz not null default date_trunc('minute', now()),
  minute_requests integer not null default 0 check (minute_requests >= 0),
  -- Janela diária para o orçamento de tokens.
  day_key date not null default current_date,
  day_tokens bigint not null default 0 check (day_tokens >= 0),
  day_requests integer not null default 0 check (day_requests >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_tenant_usage enable row level security;
drop policy if exists ai_tenant_usage_read on public.ai_tenant_usage;
create policy ai_tenant_usage_read on public.ai_tenant_usage
  for select using (app.is_org_member(organization_id));
-- Escrita apenas pelo service role, via as funções abaixo.

-- ----------------------------------------------------------------------------
-- Leases de concorrência
--
-- Um contador simples de "em voo" fica preso para sempre quando a função
-- serverless morre antes de liberar. Um lease com validade se limpa sozinho:
-- o pedido seguinte remove os vencidos antes de contar.
-- ----------------------------------------------------------------------------
create table if not exists public.ai_inflight (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  operation text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_inflight_org_idx
  on public.ai_inflight (organization_id, expires_at);

alter table public.ai_inflight enable row level security;
-- Sem políticas: tabela interna, acessada apenas pelo service role.

-- ----------------------------------------------------------------------------
-- Cache de respostas de IA
--
-- A chave é calculada pela aplicação a partir de tenant + versão do contexto +
-- operação + prompt normalizado. A chave primária inclui o workspace, então o
-- cache de um cliente nunca pode responder ao pedido de outro.
-- ----------------------------------------------------------------------------
create table if not exists public.ai_response_cache (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  cache_key text not null,
  operation text not null,
  payload jsonb not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  hits integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, cache_key)
);

create index if not exists ai_response_cache_expiry_idx
  on public.ai_response_cache (expires_at);

select app.apply_workspace_policies('ai_response_cache');

-- ----------------------------------------------------------------------------
-- Admissão: decide se esta chamada de IA pode acontecer
--
-- Verifica, na mesma transação e com a linha travada:
--   1. requisições por minuto;
--   2. tokens por dia;
--   3. chamadas simultâneas.
-- Só então reserva a vaga e devolve o lease que deve ser liberado no fim.
-- ----------------------------------------------------------------------------
create or replace function public.ai_gateway_admit(
  org uuid,
  rpm integer,
  max_concurrent integer,
  daily_tokens bigint,
  est_tokens integer default 0,
  op text default null,
  lease_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
declare
  u public.ai_tenant_usage;
  running integer;
  lease uuid;
begin
  -- Cria e trava a linha num único passo. Com `do nothing` seguido de um
  -- `select ... for update`, dois pedidos simultâneos de uma organização nova
  -- podiam ambos não enxergar a linha do outro (ainda não commitada) e passar
  -- sem contagem. O `do update` sempre devolve a linha e sempre a trava, então
  -- o segundo pedido espera o primeiro e já lê o contador atualizado.
  insert into public.ai_tenant_usage (organization_id)
  values (org)
  on conflict (organization_id) do update set updated_at = now()
  returning * into u;

  -- Vira as janelas vencidas antes de comparar com os limites.
  if u.minute_key < date_trunc('minute', now()) then
    u.minute_key := date_trunc('minute', now());
    u.minute_requests := 0;
  end if;
  if u.day_key < current_date then
    u.day_key := current_date;
    u.day_tokens := 0;
    u.day_requests := 0;
  end if;

  if u.minute_requests >= rpm then
    update public.ai_tenant_usage
       set minute_key = u.minute_key, minute_requests = u.minute_requests,
           day_key = u.day_key, day_tokens = u.day_tokens, day_requests = u.day_requests,
           updated_at = now()
     where organization_id = org;
    return jsonb_build_object(
      'allowed', false, 'reason', 'rate_limited',
      'retry_after_seconds', greatest(1, extract(epoch from (u.minute_key + interval '1 minute' - now()))::integer)
    );
  end if;

  if u.day_tokens + greatest(est_tokens, 0) > daily_tokens then
    update public.ai_tenant_usage
       set minute_key = u.minute_key, minute_requests = u.minute_requests,
           day_key = u.day_key, day_tokens = u.day_tokens, day_requests = u.day_requests,
           updated_at = now()
     where organization_id = org;
    return jsonb_build_object(
      'allowed', false, 'reason', 'daily_tokens_exhausted',
      'day_tokens', u.day_tokens, 'daily_limit', daily_tokens
    );
  end if;

  -- Leases vencidos pertencem a pedidos que morreram; somem antes da contagem.
  delete from public.ai_inflight
   where organization_id = org and expires_at < now();

  select count(*) into running from public.ai_inflight where organization_id = org;
  if running >= max_concurrent then
    update public.ai_tenant_usage
       set minute_key = u.minute_key, minute_requests = u.minute_requests,
           day_key = u.day_key, day_tokens = u.day_tokens, day_requests = u.day_requests,
           updated_at = now()
     where organization_id = org;
    return jsonb_build_object(
      'allowed', false, 'reason', 'too_many_concurrent',
      'running', running, 'limit', max_concurrent
    );
  end if;

  insert into public.ai_inflight (organization_id, operation, expires_at)
  values (org, op, now() + make_interval(secs => greatest(lease_seconds, 10)))
  returning id into lease;

  update public.ai_tenant_usage
     set minute_key = u.minute_key,
         minute_requests = u.minute_requests + 1,
         day_key = u.day_key,
         day_tokens = u.day_tokens,
         day_requests = u.day_requests + 1,
         updated_at = now()
   where organization_id = org;

  return jsonb_build_object(
    'allowed', true, 'lease', lease,
    'day_tokens', u.day_tokens, 'daily_limit', daily_tokens,
    'minute_requests', u.minute_requests + 1, 'rpm_limit', rpm
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Liberação: devolve a vaga e contabiliza os tokens realmente gastos
-- ----------------------------------------------------------------------------
create or replace function public.ai_gateway_release(
  org uuid,
  lease uuid default null,
  used_tokens integer default 0
)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if lease is not null then
    delete from public.ai_inflight where id = lease;
  end if;

  if coalesce(used_tokens, 0) > 0 then
    update public.ai_tenant_usage
       set day_tokens = case when day_key = current_date then day_tokens + used_tokens
                             else used_tokens end,
           day_key = current_date,
           updated_at = now()
     where organization_id = org;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Consulta de consumo (para a tela de cobrança e diagnóstico)
-- ----------------------------------------------------------------------------
create or replace function public.ai_gateway_usage(org uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
declare
  u public.ai_tenant_usage;
  running integer;
begin
  select * into u from public.ai_tenant_usage where organization_id = org;
  if u is null then
    return jsonb_build_object('day_tokens', 0, 'day_requests', 0, 'running', 0);
  end if;
  select count(*) into running
    from public.ai_inflight
   where organization_id = org and expires_at >= now();
  return jsonb_build_object(
    'day_tokens', case when u.day_key = current_date then u.day_tokens else 0 end,
    'day_requests', case when u.day_key = current_date then u.day_requests else 0 end,
    'minute_requests', case when u.minute_key = date_trunc('minute', now()) then u.minute_requests else 0 end,
    'running', running
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- usage_events: faltava a política de INSERT
--
-- A tabela tem RLS ligada e apenas uma política de SELECT desde a 0004, então
-- todo insert feito com o cliente do usuário era recusado. Como nenhum ponto
-- de chamada checa o erro do insert, a recusa passou despercebida e o fluxo de
-- uso ('ai_request', 'dashboard_created') nunca foi gravado — só sobraram os
-- eventos escritos por funções SECURITY DEFINER. Sem esses registros não há
-- como medir consumo por cliente, que é a base de qualquer cota.
-- ----------------------------------------------------------------------------
drop policy if exists usage_events_insert on public.usage_events;
create policy usage_events_insert on public.usage_events for insert
  with check (app.is_org_member(organization_id));

revoke execute on function public.ai_gateway_admit(uuid, integer, integer, bigint, integer, text, integer) from public, anon, authenticated;
revoke execute on function public.ai_gateway_release(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.ai_gateway_usage(uuid) from public, anon, authenticated;
grant execute on function public.ai_gateway_admit(uuid, integer, integer, bigint, integer, text, integer) to service_role;
grant execute on function public.ai_gateway_release(uuid, uuid, integer) to service_role;
grant execute on function public.ai_gateway_usage(uuid) to service_role;
