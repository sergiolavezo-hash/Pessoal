-- ============================================================================
-- Atlas Insight AI — 0010 Folders + Data Prep (estilo Power Query)
--   * pastas (folder) para organizar dashboards, fontes, métricas, regras
--     e arquivos
--   * colunas ocultáveis no catálogo (excluded)
--   * RPCs para transformar tabelas de arquivo: adicionar coluna calculada,
--     remover e renomear colunas (service role; a API valida a expressão)
-- ============================================================================

alter table public.dashboards add column if not exists folder text;
alter table public.data_sources add column if not exists folder text;
alter table public.metrics add column if not exists folder text;
alter table public.business_rules add column if not exists folder text;
alter table public.workspace_files add column if not exists folder text;

alter table public.catalog_columns add column if not exists excluded boolean not null default false;
alter table public.catalog_columns add column if not exists expression text;

-- ---------------------------------------------------------------------------
-- Transformações físicas em tabelas de arquivo (schema file_data).
-- A expressão chega validada pela aplicação (identificadores conferidos
-- contra as colunas reais + allowlist de funções); aqui garantimos que o
-- alvo é uma tabela de file_data e tipos permitidos.
-- ---------------------------------------------------------------------------
create or replace function public.add_file_computed_column(
  p_table_name text, p_column_name text, p_type text, p_expression text
) returns void
language plpgsql
security definer set search_path = file_data, public
as $$
begin
  if p_type not in ('text', 'numeric', 'bigint', 'double precision', 'date', 'timestamptz', 'boolean') then
    raise exception 'invalid_type';
  end if;
  if not exists (select 1 from pg_tables where schemaname = 'file_data' and tablename = p_table_name) then
    raise exception 'table_not_found';
  end if;
  execute format('alter table file_data.%I add column %I %s', p_table_name, p_column_name, p_type);
  execute format('update file_data.%I set %I = (%s)::%s', p_table_name, p_column_name, p_expression, p_type);
end;
$$;

create or replace function public.drop_file_column(p_table_name text, p_column_name text)
returns void
language plpgsql
security definer set search_path = file_data, public
as $$
begin
  if not exists (select 1 from pg_tables where schemaname = 'file_data' and tablename = p_table_name) then
    raise exception 'table_not_found';
  end if;
  execute format('alter table file_data.%I drop column %I', p_table_name, p_column_name);
end;
$$;

create or replace function public.rename_file_column(p_table_name text, p_old text, p_new text)
returns void
language plpgsql
security definer set search_path = file_data, public
as $$
begin
  if not exists (select 1 from pg_tables where schemaname = 'file_data' and tablename = p_table_name) then
    raise exception 'table_not_found';
  end if;
  execute format('alter table file_data.%I rename column %I to %I', p_table_name, p_old, p_new);
end;
$$;

revoke all on function public.add_file_computed_column(text, text, text, text) from public;
revoke all on function public.drop_file_column(text, text) from public;
revoke all on function public.rename_file_column(text, text, text) from public;
grant execute on function public.add_file_computed_column(text, text, text, text) to service_role;
grant execute on function public.drop_file_column(text, text) to service_role;
grant execute on function public.rename_file_column(text, text, text) to service_role;
