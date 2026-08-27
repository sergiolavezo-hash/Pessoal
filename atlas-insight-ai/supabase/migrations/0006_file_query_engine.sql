-- ============================================================================
-- Atlas Insight AI — 0006 File query engine.
-- Uploaded CSV/XLSX files become REAL Postgres tables in the `file_data`
-- schema so the query engine can run genuine SQL over them. All functions
-- here are executable by the service role only (the API layer performs
-- workspace authorization first).
-- ============================================================================

create schema if not exists file_data;

-- Restricted role used to execute user/AI queries over file data:
-- SELECT-only, on file_data only.
do $$ begin
  create role atlas_file_reader nologin;
exception when duplicate_object then null; end $$;

grant usage on schema file_data to atlas_file_reader;
alter default privileges in schema file_data grant select on tables to atlas_file_reader;

-- The definer role must be able to switch to atlas_file_reader.
do $$ begin
  grant atlas_file_reader to postgres;
exception when others then null; end $$;

-- ----------------------------------------------------------------------------
-- Create a physical table for an uploaded file.
-- columns: [{"name": "region", "type": "text"}, ...]; types are restricted.
-- ----------------------------------------------------------------------------
create or replace function public.create_file_table(p_table_name text, p_columns jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  col record;
  ddl text := '';
begin
  if p_table_name !~ '^[a-z][a-z0-9_]{0,62}$' then
    raise exception 'invalid table name';
  end if;
  for col in select * from jsonb_to_recordset(p_columns) as x(name text, type text)
  loop
    if col.name !~ '^[a-z_][a-z0-9_]{0,62}$' then
      raise exception 'invalid column name: %', col.name;
    end if;
    if col.type not in ('text', 'numeric', 'boolean', 'timestamptz', 'date', 'bigint', 'double precision') then
      raise exception 'invalid column type: %', col.type;
    end if;
    ddl := ddl || format('%I %s, ', col.name, col.type);
  end loop;
  ddl := left(ddl, length(ddl) - 2);
  execute format('drop table if exists file_data.%I', p_table_name);
  execute format('create table file_data.%I (%s)', p_table_name, ddl);
  execute format('grant select on file_data.%I to atlas_file_reader', p_table_name);
end;
$$;

-- ----------------------------------------------------------------------------
-- Bulk insert rows (jsonb array of objects) into a file table.
-- ----------------------------------------------------------------------------
create or replace function public.insert_file_rows(p_table_name text, p_rows jsonb)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  inserted bigint;
begin
  if p_table_name !~ '^[a-z][a-z0-9_]{0,62}$' then
    raise exception 'invalid table name';
  end if;
  execute format(
    'insert into file_data.%I select * from jsonb_populate_recordset(null::file_data.%I, $1)',
    p_table_name, p_table_name
  ) using p_rows;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

create or replace function public.drop_file_table(p_table_name text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_table_name !~ '^[a-z][a-z0-9_]{0,62}$' then
    raise exception 'invalid table name';
  end if;
  execute format('drop table if exists file_data.%I', p_table_name);
end;
$$;

-- ----------------------------------------------------------------------------
-- Read-only query execution over file_data.
-- Runs under the SELECT-only atlas_file_reader role with a statement timeout;
-- the query is additionally wrapped in a subselect with a row limit, which
-- syntactically rules out DML/DDL and multi-statement input.
-- ----------------------------------------------------------------------------
create or replace function public.run_file_query(p_query text, p_max_rows int default 10000, p_timeout_ms int default 30000)
returns jsonb
language plpgsql
security definer set search_path = file_data, public
as $$
declare
  result jsonb;
begin
  execute format('set local statement_timeout = %s', greatest(100, least(p_timeout_ms, 120000)));
  execute 'set local role atlas_file_reader';
  execute format(
    'select coalesce(jsonb_agg(row_to_json(q)), ''[]''::jsonb) from (%s) q limit 1',
    format('select * from (%s) inner_q limit %s', p_query, greatest(1, least(p_max_rows, 50000)))
  ) into result;
  return result;
end;
$$;

-- Introspection of file tables for the connector.
create or replace function public.list_file_tables()
returns jsonb
language sql
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', tablename)), '[]'::jsonb)
  from pg_tables where schemaname = 'file_data';
$$;

create or replace function public.get_file_table_columns(p_table_name text)
returns jsonb
language sql
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', column_name, 'type', data_type, 'nullable', is_nullable = 'YES', 'ordinal', ordinal_position
  ) order by ordinal_position), '[]'::jsonb)
  from information_schema.columns
  where table_schema = 'file_data' and table_name = p_table_name;
$$;

-- Service-role only: strip default execute grants.
revoke execute on function public.create_file_table(text, jsonb) from public, anon, authenticated;
revoke execute on function public.insert_file_rows(text, jsonb) from public, anon, authenticated;
revoke execute on function public.drop_file_table(text) from public, anon, authenticated;
revoke execute on function public.run_file_query(text, int, int) from public, anon, authenticated;
revoke execute on function public.list_file_tables() from public, anon, authenticated;
revoke execute on function public.get_file_table_columns(text) from public, anon, authenticated;
grant execute on function public.create_file_table(text, jsonb) to service_role;
grant execute on function public.insert_file_rows(text, jsonb) to service_role;
grant execute on function public.drop_file_table(text) to service_role;
grant execute on function public.run_file_query(text, int, int) to service_role;
grant execute on function public.list_file_tables() to service_role;
grant execute on function public.get_file_table_columns(text) to service_role;
