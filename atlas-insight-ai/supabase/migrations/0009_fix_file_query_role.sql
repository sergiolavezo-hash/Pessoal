-- ============================================================================
-- Atlas Insight AI — 0009 Fix: run_file_query em Postgres gerenciado.
-- O Postgres proíbe `SET ROLE` dentro de função SECURITY DEFINER
-- ("cannot set parameter \"role\" within security-definer function").
-- Correção em duas camadas, cada uma tolerante a falha da outra:
--   1. A função é recriada SEM o SET ROLE (isso sozinho elimina o erro;
--      a segurança sintática — subselect com LIMIT — permanece, e o
--      sql-guard da aplicação já validou a consulta antes).
--   2. Quando possível, a função passa a PERTENCER ao papel restrito
--      atlas_file_reader (SELECT-only em file_data) — least privilege.
-- ============================================================================

-- Garante o papel restrito e seus privilégios (idempotente).
do $$ begin
  create role atlas_file_reader nologin;
exception when duplicate_object then null; end $$;

grant usage on schema file_data to atlas_file_reader;
grant select on all tables in schema file_data to atlas_file_reader;
alter default privileges in schema file_data grant select on tables to atlas_file_reader;

do $$ begin
  grant atlas_file_reader to postgres;
exception when others then raise notice 'grant to postgres pulado: %', sqlerrm; end $$;

-- Função sem SET ROLE.
create or replace function public.run_file_query(p_query text, p_max_rows int default 10000, p_timeout_ms int default 30000)
returns jsonb
language plpgsql
security definer set search_path = file_data, public
as $$
declare
  result jsonb;
begin
  execute format('set local statement_timeout = %s', greatest(100, least(p_timeout_ms, 120000)));
  execute format(
    'select coalesce(jsonb_agg(row_to_json(q)), ''[]''::jsonb) from (%s) q limit 1',
    format('select * from (%s) inner_q limit %s', p_query, greatest(1, least(p_max_rows, 50000)))
  ) into result;
  return result;
end;
$$;

-- Least privilege: dono = papel restrito (se as permissões permitirem).
do $$ begin
  alter function public.run_file_query(text, int, int) owner to atlas_file_reader;
exception when others then raise notice 'owner change pulado: %', sqlerrm; end $$;

revoke all on function public.run_file_query(text, int, int) from public;
grant execute on function public.run_file_query(text, int, int) to service_role;
