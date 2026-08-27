-- =====================================================================
-- Atlas Insight AI — 0002_platform
-- Fontes de dados, metadata, camada semântica, métricas, regras de
-- negócio, dashboards, IA e execuções de query — tudo com RLS.
-- =====================================================================

-- ---------- Enums ----------
create type public.data_source_kind as enum
  ('BIGQUERY', 'POSTGRES', 'SQLSERVER', 'MYSQL', 'ORACLE', 'AZURE_SQL',
   'SNOWFLAKE', 'REDSHIFT', 'DATABRICKS', 'FILE', 'REST_API');
create type public.data_source_status as enum ('PENDING', 'CONNECTED', 'ERROR', 'DISABLED');
create type public.metric_status as enum ('DRAFT', 'VALIDATED', 'ACTIVE', 'DEPRECATED');
create type public.rule_status as enum ('DRAFT', 'ACTIVE', 'ARCHIVED');
create type public.dashboard_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
create type public.file_status as enum ('UPLOADING', 'PROCESSING', 'READY', 'ERROR');
create type public.ai_run_status as enum ('RUNNING', 'COMPLETED', 'FAILED');
create type public.query_status as enum ('RUNNING', 'SUCCESS', 'ERROR', 'TIMEOUT', 'BLOCKED');

-- ---------- Data sources ----------
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.data_source_kind not null,
  name text not null,
  status public.data_source_status not null default 'PENDING',
  config jsonb not null default '{}'::jsonb,        -- host/porta/projeto — NUNCA secrets
  last_sync_at timestamptz,
  last_error text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_ds_ws on public.data_sources (workspace_id);

-- Credenciais criptografadas (AES-256-GCM no backend) — acesso apenas via service role
create table public.data_source_credentials (
  data_source_id uuid primary key references public.data_sources (id) on delete cascade,
  ciphertext text not null,     -- payload criptografado
  iv text not null,
  auth_tag text not null,
  key_version int not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------- Metadata descoberta ----------
create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources (id) on delete cascade,
  name text not null,
  unique (data_source_id, name)
);

create table public.source_tables (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  name text not null,
  row_count bigint,
  profiled_at timestamptz,
  unique (dataset_id, name)
);

create table public.source_columns (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.source_tables (id) on delete cascade,
  name text not null,
  data_type text not null,
  is_nullable boolean not null default true,
  ordinal int not null,
  profile jsonb,                 -- unique_count, null_pct, min, max, avg, samples
  classification text,           -- ID | FK | DIMENSION | MEASURE | DATE | TEXT | BOOLEAN | CATEGORY
  classification_confidence numeric(4,3),
  unique (table_id, name)
);

create table public.detected_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  from_column uuid not null references public.source_columns (id) on delete cascade,
  to_column uuid not null references public.source_columns (id) on delete cascade,
  relationship_type text not null default 'many_to_one',
  confidence numeric(4,3) not null,
  reason text,
  source text not null default 'INFERRED',   -- INFERRED | DECLARED | USER
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Camada semântica (versionada) ----------
create table public.semantic_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version int not null default 1,
  status text not null default 'ACTIVE',      -- ACTIVE | SUPERSEDED
  definition jsonb not null,                  -- validado por Zod no app
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (workspace_id, version)
);

-- ---------- Métricas ----------
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  formula text not null,
  aggregation text,
  format text not null default 'number',
  status public.metric_status not null default 'DRAFT',
  certified boolean not null default false,
  version int not null default 1,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, slug)
);

create table public.metric_dependencies (
  metric_id uuid not null references public.metrics (id) on delete cascade,
  depends_on uuid not null references public.metrics (id) on delete cascade,
  primary key (metric_id, depends_on),
  check (metric_id <> depends_on)
);

-- ---------- Regras de negócio ----------
create table public.business_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  natural_language_definition text not null,
  structured_definition jsonb,
  affected_entities text[] not null default '{}',
  affected_metrics uuid[] not null default '{}',
  status public.rule_status not null default 'DRAFT',
  version int not null default 1,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Documentos de conhecimento ----------
create table public.business_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  status public.file_status not null default 'UPLOADING',
  extracted jsonb,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------- Dashboards ----------
create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  status public.dashboard_status not null default 'DRAFT',
  specification jsonb not null,               -- DashboardSpecification (Zod)
  version int not null default 1,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_dash_ws on public.dashboards (workspace_id);

create table public.dashboard_versions (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  version int not null,
  specification jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (dashboard_id, version)
);

-- ---------- IA ----------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content jsonb not null,                     -- texto + evidências + spec de visual
  created_at timestamptz not null default now()
);
create index idx_ai_msgs_conv on public.ai_messages (conversation_id, created_at);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id),
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  provider text not null,
  model text not null,
  purpose text not null,                      -- intent | sql | dashboard_spec | insight | rule_parse
  prompt_hash text,
  context_version text,
  status public.ai_run_status not null default 'RUNNING',
  input_tokens int,
  output_tokens int,
  error text,
  query_execution_id uuid,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index idx_ai_runs_ws on public.ai_runs (workspace_id, started_at desc);

-- ---------- Execuções de query ----------
create table public.query_executions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  data_source_id uuid references public.data_sources (id) on delete set null,
  user_id uuid references auth.users (id),
  sql text not null,
  status public.query_status not null default 'RUNNING',
  row_count int,
  duration_ms int,
  error text,
  executed_at timestamptz not null default now()
);
create index idx_qe_ws on public.query_executions (workspace_id, executed_at desc);

-- ---------- updated_at triggers ----------
create trigger trg_ds_touch before update on public.data_sources
  for each row execute function public.touch_updated_at();
create trigger trg_metrics_touch before update on public.metrics
  for each row execute function public.touch_updated_at();
create trigger trg_rules_touch before update on public.business_rules
  for each row execute function public.touch_updated_at();
create trigger trg_dash_touch before update on public.dashboards
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- RLS — isolamento total por workspace/organização
-- =====================================================================
alter table public.data_sources enable row level security;
alter table public.data_source_credentials enable row level security;
alter table public.datasets enable row level security;
alter table public.source_tables enable row level security;
alter table public.source_columns enable row level security;
alter table public.detected_relationships enable row level security;
alter table public.semantic_models enable row level security;
alter table public.metrics enable row level security;
alter table public.metric_dependencies enable row level security;
alter table public.business_rules enable row level security;
alter table public.business_documents enable row level security;
alter table public.dashboards enable row level security;
alter table public.dashboard_versions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_runs enable row level security;
alter table public.query_executions enable row level security;

-- Helper local: membro do workspace
create or replace function public.is_ws_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_org_member(public.workspace_org(ws));
$$;
create or replace function public.ws_has_role(ws uuid, min_role public.org_role)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(public.workspace_org(ws), min_role);
$$;

-- Data sources
create policy ds_select on public.data_sources for select
  using (public.is_ws_member(workspace_id) and deleted_at is null);
create policy ds_write on public.data_sources for insert
  with check (public.ws_has_role(workspace_id, 'EDITOR'));
create policy ds_update on public.data_sources for update
  using (public.ws_has_role(workspace_id, 'EDITOR'));
create policy ds_delete on public.data_sources for delete
  using (public.ws_has_role(workspace_id, 'ADMIN'));

-- Credenciais: NENHUM acesso via anon/authenticated — somente service role (backend)
-- (RLS habilitada sem policies = bloqueio total para clientes)

-- Metadata (herda pertencimento via data_source → workspace)
create policy datasets_select on public.datasets for select using (
  exists (select 1 from public.data_sources d
          where d.id = data_source_id and public.is_ws_member(d.workspace_id))
);
create policy tables_select on public.source_tables for select using (
  exists (select 1 from public.datasets ds join public.data_sources d on d.id = ds.data_source_id
          where ds.id = dataset_id and public.is_ws_member(d.workspace_id))
);
create policy columns_select on public.source_columns for select using (
  exists (select 1 from public.source_tables t
          join public.datasets ds on ds.id = t.dataset_id
          join public.data_sources d on d.id = ds.data_source_id
          where t.id = table_id and public.is_ws_member(d.workspace_id))
);
create policy rel_select on public.detected_relationships for select
  using (public.is_ws_member(workspace_id));
create policy rel_write on public.detected_relationships for all
  using (public.ws_has_role(workspace_id, 'EDITOR'))
  with check (public.ws_has_role(workspace_id, 'EDITOR'));

-- Semantic models
create policy sem_select on public.semantic_models for select using (public.is_ws_member(workspace_id));
create policy sem_write on public.semantic_models for insert with check (public.ws_has_role(workspace_id, 'EDITOR'));
create policy sem_update on public.semantic_models for update using (public.ws_has_role(workspace_id, 'EDITOR'));

-- Metrics
create policy metrics_select on public.metrics for select
  using (public.is_ws_member(workspace_id) and deleted_at is null);
create policy metrics_write on public.metrics for insert with check (public.ws_has_role(workspace_id, 'EDITOR'));
create policy metrics_update on public.metrics for update using (public.ws_has_role(workspace_id, 'EDITOR'));
create policy metrics_delete on public.metrics for delete using (public.ws_has_role(workspace_id, 'ADMIN'));
create policy metric_deps_all on public.metric_dependencies for all using (
  exists (select 1 from public.metrics m where m.id = metric_id and public.is_ws_member(m.workspace_id))
) with check (
  exists (select 1 from public.metrics m where m.id = metric_id and public.ws_has_role(m.workspace_id, 'EDITOR'))
);

-- Business rules & documents
create policy rules_select on public.business_rules for select using (public.is_ws_member(workspace_id));
create policy rules_write on public.business_rules for insert with check (public.ws_has_role(workspace_id, 'EDITOR'));
create policy rules_update on public.business_rules for update using (public.ws_has_role(workspace_id, 'EDITOR'));
create policy docs_select on public.business_documents for select using (public.is_ws_member(workspace_id));
create policy docs_write on public.business_documents for insert with check (public.ws_has_role(workspace_id, 'EDITOR'));
create policy docs_update on public.business_documents for update using (public.ws_has_role(workspace_id, 'EDITOR'));

-- Dashboards
create policy dash_select on public.dashboards for select
  using (public.is_ws_member(workspace_id) and deleted_at is null);
create policy dash_write on public.dashboards for insert with check (public.ws_has_role(workspace_id, 'EDITOR'));
create policy dash_update on public.dashboards for update using (public.ws_has_role(workspace_id, 'EDITOR'));
create policy dash_delete on public.dashboards for delete using (public.ws_has_role(workspace_id, 'ADMIN'));
create policy dashv_select on public.dashboard_versions for select using (
  exists (select 1 from public.dashboards d where d.id = dashboard_id and public.is_ws_member(d.workspace_id))
);
create policy dashv_write on public.dashboard_versions for insert with check (
  exists (select 1 from public.dashboards d where d.id = dashboard_id and public.ws_has_role(d.workspace_id, 'EDITOR'))
);

-- IA: conversas pertencem ao usuário dentro do workspace
create policy conv_select on public.ai_conversations for select
  using (public.is_ws_member(workspace_id) and user_id = auth.uid());
create policy conv_write on public.ai_conversations for insert
  with check (public.is_ws_member(workspace_id) and user_id = auth.uid());
create policy conv_update on public.ai_conversations for update
  using (user_id = auth.uid());
create policy msgs_all on public.ai_messages for all using (
  exists (select 1 from public.ai_conversations c
          where c.id = conversation_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.ai_conversations c
          where c.id = conversation_id and c.user_id = auth.uid())
);
create policy runs_select on public.ai_runs for select using (public.is_ws_member(workspace_id));

-- Query executions
create policy qe_select on public.query_executions for select using (public.is_ws_member(workspace_id));
