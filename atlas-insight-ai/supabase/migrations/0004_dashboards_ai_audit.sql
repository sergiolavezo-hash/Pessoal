-- ============================================================================
-- Atlas Insight AI — 0004 Dashboards, AI conversations/runs, query
-- executions, audit logs, billing/usage.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Dashboards (spec-driven, versioned)
-- ----------------------------------------------------------------------------
create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  -- Validated DashboardSpecification JSON
  spec jsonb not null default '{}'::jsonb,
  version int not null default 1,
  generated_by_ai boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_dashboards_ws on public.dashboards (workspace_id);

create table if not exists public.dashboard_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  version int not null,
  spec jsonb not null,
  change_summary text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (dashboard_id, version)
);

-- ----------------------------------------------------------------------------
-- Query executions (evidence for every number the product shows)
-- ----------------------------------------------------------------------------
create table if not exists public.query_executions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  data_source_id uuid references public.data_sources (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  sql text not null,
  dialect text,
  status text not null default 'RUNNING'
    check (status in ('RUNNING', 'SUCCEEDED', 'FAILED', 'TIMEOUT', 'BLOCKED')),
  row_count int,
  duration_ms int,
  error text,
  -- What the query was for: {"metric": ..., "period": ..., "filters": ...}
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_query_exec_ws on public.query_executions (workspace_id, created_at desc);

-- ----------------------------------------------------------------------------
-- AI conversations / messages / runs
-- ----------------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  -- Evidence: charts, tables, query execution ids, metrics used
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_messages_conv on public.ai_messages (conversation_id, created_at);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  kind text not null check (kind in (
    'analyze', 'chat', 'dashboard_generate', 'dashboard_edit',
    'business_rule_parse', 'insight', 'sql_generate', 'document_extract'
  )),
  provider text not null,
  model text not null,
  prompt_hash text,
  context_version text,
  status text not null default 'RUNNING' check (status in ('RUNNING', 'SUCCEEDED', 'FAILED')),
  input_tokens int,
  output_tokens int,
  error text,
  query_execution_id uuid references public.query_executions (id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_ai_runs_ws on public.ai_runs (workspace_id, started_at desc);

-- ----------------------------------------------------------------------------
-- Audit logs (insert via server; members can read their workspace's logs)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  result text not null default 'success' check (result in ('success', 'failure')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_ws on public.audit_logs (workspace_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select
  using (workspace_id is not null and app.is_workspace_member(workspace_id));

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs for insert
  with check (
    user_id = auth.uid()
    and (workspace_id is null or app.is_workspace_member(workspace_id))
  );

-- ----------------------------------------------------------------------------
-- Billing / usage (decoupled: nothing else references these tables)
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade unique,
  plan text not null default 'FREE' check (plan in ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  external_customer_id text,
  external_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in (
    'ai_request', 'ai_tokens', 'query_execution', 'data_source_created',
    'dashboard_created', 'file_uploaded', 'storage_bytes'
  )),
  quantity bigint not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_org on public.usage_events (organization_id, created_at desc);

alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions for select
  using (app.is_org_member(organization_id));

alter table public.usage_events enable row level security;
drop policy if exists usage_events_select on public.usage_events;
create policy usage_events_select on public.usage_events for select
  using (app.has_org_role(organization_id, 'ADMIN'));

-- ----------------------------------------------------------------------------
-- Workspace-scoped RLS
-- ----------------------------------------------------------------------------
select app.apply_workspace_policies(t) from unnest(array[
  'dashboards', 'dashboard_versions', 'ai_conversations', 'ai_messages'
]) as t;

-- query_executions / ai_runs: members can read; inserts happen server-side
-- with the caller's JWT, EDITOR+ required to execute.
select app.apply_workspace_policies(t) from unnest(array[
  'query_executions', 'ai_runs'
]) as t;

drop trigger if exists set_updated_at on public.dashboards;
create trigger set_updated_at before update on public.dashboards
  for each row execute function app.set_updated_at();
drop trigger if exists set_updated_at on public.ai_conversations;
create trigger set_updated_at before update on public.ai_conversations
  for each row execute function app.set_updated_at();
