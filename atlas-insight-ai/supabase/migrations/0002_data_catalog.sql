-- ============================================================================
-- Atlas Insight AI — 0002 Data sources, credentials, catalog (datasets,
-- tables, columns, relationships) and uploaded files.
-- ============================================================================

-- Standard workspace-scoped RLS policy generator.
-- select: any org member; insert/update/delete: EDITOR and above.
create or replace function app.apply_workspace_policies(tbl text)
returns void
language plpgsql
as $$
begin
  execute format('alter table public.%I enable row level security', tbl);
  execute format('drop policy if exists %I on public.%I', tbl || '_select', tbl);
  execute format(
    'create policy %I on public.%I for select using (app.is_workspace_member(workspace_id))',
    tbl || '_select', tbl);
  execute format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
  execute format(
    'create policy %I on public.%I for insert with check (app.has_workspace_role(workspace_id, ''EDITOR''))',
    tbl || '_insert', tbl);
  execute format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
  execute format(
    'create policy %I on public.%I for update using (app.has_workspace_role(workspace_id, ''EDITOR'')) with check (app.has_workspace_role(workspace_id, ''EDITOR''))',
    tbl || '_update', tbl);
  execute format('drop policy if exists %I on public.%I', tbl || '_delete', tbl);
  execute format(
    'create policy %I on public.%I for delete using (app.has_workspace_role(workspace_id, ''EDITOR''))',
    tbl || '_delete', tbl);
end;
$$;

-- ----------------------------------------------------------------------------
-- Data sources
-- ----------------------------------------------------------------------------
create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  type text not null check (type in (
    'bigquery', 'postgres', 'sqlserver', 'mysql', 'oracle', 'azuresql',
    'snowflake', 'redshift', 'databricks', 'file', 'rest'
  )),
  status text not null default 'PENDING' check (status in ('PENDING', 'CONNECTED', 'ERROR', 'SYNCING')),
  -- Non-secret configuration (host, port, database, project id...).
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_data_sources_ws on public.data_sources (workspace_id);

-- Secrets: encrypted server-side, readable ONLY via service role (no policies
-- for authenticated users -> RLS denies everything).
create table if not exists public.data_source_credentials (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources (id) on delete cascade unique,
  -- AES-256-GCM ciphertext (base64) produced with ENCRYPTION_KEY.
  encrypted_payload text not null,
  key_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.data_source_credentials enable row level security;
-- No policies on purpose: only service-role access.

-- ----------------------------------------------------------------------------
-- Catalog
-- ----------------------------------------------------------------------------
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  data_source_id uuid not null references public.data_sources (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_source_id, name)
);

create table if not exists public.catalog_tables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  name text not null,
  row_count bigint,
  profiled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dataset_id, name)
);

create table if not exists public.catalog_columns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  table_id uuid not null references public.catalog_tables (id) on delete cascade,
  name text not null,
  data_type text not null,
  ordinal int not null default 0,
  nullable boolean not null default true,
  -- Profiling output
  profile jsonb not null default '{}'::jsonb,
  -- {"classification": "MEASURE", "confidence": 0.97}
  classification jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (table_id, name)
);

create index if not exists idx_catalog_columns_table on public.catalog_columns (table_id);

create table if not exists public.catalog_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_column_id uuid not null references public.catalog_columns (id) on delete cascade,
  target_column_id uuid not null references public.catalog_columns (id) on delete cascade,
  relationship_type text not null default 'many-to-one'
    check (relationship_type in ('one-to-one', 'one-to-many', 'many-to-one', 'many-to-many')),
  confidence numeric(4, 3) not null default 0.5,
  reason text,
  source text not null default 'inferred' check (source in ('inferred', 'declared', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_column_id, target_column_id)
);

-- ----------------------------------------------------------------------------
-- Uploaded files (CSV/XLSX/documents)
-- ----------------------------------------------------------------------------
create table if not exists public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  data_source_id uuid references public.data_sources (id) on delete set null,
  name text not null,
  kind text not null check (kind in ('data', 'document')),
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  status text not null default 'UPLOADING'
    check (status in ('UPLOADING', 'PROCESSING', 'READY', 'ERROR')),
  error text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Parsed rows of uploaded data files, queried by the file connector.
create table if not exists public.file_table_rows (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  table_id uuid not null references public.catalog_tables (id) on delete cascade,
  row_index bigint not null,
  data jsonb not null
);

create index if not exists idx_file_rows_table on public.file_table_rows (table_id, row_index);

-- ----------------------------------------------------------------------------
-- RLS + triggers
-- ----------------------------------------------------------------------------
select app.apply_workspace_policies(t) from unnest(array[
  'data_sources', 'datasets', 'catalog_tables', 'catalog_columns',
  'catalog_relationships', 'workspace_files', 'file_table_rows'
]) as t;

drop trigger if exists set_updated_at on public.data_sources;
create trigger set_updated_at before update on public.data_sources
  for each row execute function app.set_updated_at();
drop trigger if exists set_updated_at on public.workspace_files;
create trigger set_updated_at before update on public.workspace_files
  for each row execute function app.set_updated_at();
