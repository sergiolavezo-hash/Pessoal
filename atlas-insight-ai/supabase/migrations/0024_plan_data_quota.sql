-- ============================================================================
-- Atlas Insight AI — 0024 Teto de dados por conta, vindo do plano.
--
-- O Postgres do plano gratuito do Supabase tem 500 MB — e esses 500 MB são do
-- banco INTEIRO, compartilhados por todas as contas. Medido com a base COVID
-- real: 306.429 linhas ocupam 30 MB, 101 bytes por linha. Ou seja, dezesseis
-- bases desse tamanho enchem o banco de todo mundo.
--
-- Até aqui não havia teto nenhum por conta. O sintoma quando enchesse não
-- seria "fulano estourou o limite": seria o produto inteiro parando de
-- aceitar upload, para todos os clientes ao mesmo tempo, sem explicação.
--
-- A unidade é LINHA, não byte, por um motivo prático: a linha é conhecida
-- ANTES de gravar, então dá para recusar sem ter escrito nada. Byte só se
-- sabe depois. A ~100 bytes por linha medidos, a conversão é direta.
--
-- -1 significa sem teto.
--
-- Idempotente: pode rodar de novo sem efeito.
-- ============================================================================

alter table public.billing_plans
  add column if not exists max_data_rows bigint not null default 50000;

comment on column public.billing_plans.max_data_rows is
  'Total de linhas de dados que a organização pode manter. -1 = sem teto. Medido: ~100 bytes por linha.';

-- O gratuito é uma demonstração, não um armazenamento. 50 mil linhas são
-- ~5 MB: dá para conhecer o produto com dado de verdade sem que dez contas
-- gratuitas derrubem o banco de quem paga.
update public.billing_plans set max_data_rows = 50000    where id = 'free';
update public.billing_plans set max_data_rows = 5000000  where id = 'pro';
update public.billing_plans set max_data_rows = -1       where id = 'business';

-- ----------------------------------------------------------------------------
-- Quantas linhas a organização já mantém, e qual o teto dela.
--
-- Conta pelo catálogo (catalog_tables.row_count), que é o número oficial
-- depois que a ingestão termina — e que a 0023 fez passar a ser gravado só no
-- fim, justamente para não contar linha que não entrou.
-- ----------------------------------------------------------------------------
create or replace function public.data_quota_status(org uuid)
returns jsonb
language sql
security definer set search_path = public
as $$
  select jsonb_build_object(
    'used_rows', coalesce((
      select sum(t.row_count)
      from public.catalog_tables t
      join public.workspaces w on w.id = t.workspace_id
      where w.organization_id = org
    ), 0),
    'max_rows', coalesce((
      select p.max_data_rows
      from public.subscriptions s
      join public.billing_plans p on p.id = s.plan_id
      where s.organization_id = org and s.status in ('active', 'trialing')
      limit 1
    ), (select max_data_rows from public.billing_plans where id = 'free'), 50000)
  );
$$;

revoke execute on function public.data_quota_status(uuid) from public, anon;
grant execute on function public.data_quota_status(uuid) to authenticated, service_role;
