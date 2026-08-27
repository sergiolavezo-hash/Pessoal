-- ============================================================================
-- Atlas Insight AI — 0003 Semantic layer, metrics engine, business rules,
-- document knowledge (RAG-ready).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Semantic layer (versioned)
-- ----------------------------------------------------------------------------
create table if not exists public.semantic_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  data_source_id uuid references public.data_sources (id) on delete cascade,
  name text not null,
  version int not null default 1,
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  -- Full validated SemanticModel JSON (entities, dimensions, measures, relationships)
  definition jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_semantic_models_ws on public.semantic_models (workspace_id);

create table if not exists public.semantic_entities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  semantic_model_id uuid not null references public.semantic_models (id) on delete cascade,
  table_id uuid references public.catalog_tables (id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (semantic_model_id, name)
);

create table if not exists public.semantic_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_id uuid not null references public.semantic_entities (id) on delete cascade,
  column_id uuid references public.catalog_columns (id) on delete set null,
  name text not null,
  description text,
  field_type text not null check (field_type in ('DIMENSION', 'MEASURE', 'ATTRIBUTE')),
  data_type text,
  default_aggregation text check (default_aggregation in ('SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'COUNT_DISTINCT')),
  format text,
  synonyms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, name)
);

-- ----------------------------------------------------------------------------
-- Metrics engine
-- ----------------------------------------------------------------------------
create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  semantic_model_id uuid references public.semantic_models (id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  -- Semantic formula, e.g. "SUM(Sales.revenue)" or "metric(revenue) - metric(cost)"
  formula text not null,
  aggregation text check (aggregation in ('SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'COUNT_DISTINCT', 'RATIO', 'DERIVED')),
  format text not null default 'number',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'VALIDATED', 'ACTIVE', 'DEPRECATED')),
  certified boolean not null default false,
  version int not null default 1,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, slug)
);

create table if not exists public.metric_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  metric_id uuid not null references public.metrics (id) on delete cascade,
  depends_on_metric_id uuid references public.metrics (id) on delete cascade,
  depends_on_field_id uuid references public.semantic_fields (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (depends_on_metric_id is not null or depends_on_field_id is not null)
);

-- ----------------------------------------------------------------------------
-- Business rules
-- ----------------------------------------------------------------------------
create table if not exists public.business_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  natural_language_definition text not null,
  -- AI-produced structured representation ({"type": "filter", "entity": ..., ...})
  structured_definition jsonb not null default '{}'::jsonb,
  affected_metrics uuid[] not null default '{}',
  affected_entities text[] not null default '{}',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  version int not null default 1,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Glossary
-- ----------------------------------------------------------------------------
create table if not exists public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  term text not null,
  synonyms text[] not null default '{}',
  definition text,
  metric_id uuid references public.metrics (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, term)
);

-- ----------------------------------------------------------------------------
-- Document knowledge (RAG pipeline)
-- ----------------------------------------------------------------------------
create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  file_id uuid references public.workspace_files (id) on delete cascade,
  title text not null,
  status text not null default 'PROCESSING'
    check (status in ('PROCESSING', 'READY', 'ERROR')),
  extracted_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  document_id uuid not null references public.business_documents (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists idx_document_chunks_doc on public.document_chunks (document_id);

-- ----------------------------------------------------------------------------
-- RLS + triggers
-- ----------------------------------------------------------------------------
select app.apply_workspace_policies(t) from unnest(array[
  'semantic_models', 'semantic_entities', 'semantic_fields',
  'metrics', 'metric_dependencies', 'business_rules', 'glossary_terms',
  'business_documents', 'document_chunks'
]) as t;

drop trigger if exists set_updated_at on public.metrics;
create trigger set_updated_at before update on public.metrics
  for each row execute function app.set_updated_at();
drop trigger if exists set_updated_at on public.business_rules;
create trigger set_updated_at before update on public.business_rules
  for each row execute function app.set_updated_at();
drop trigger if exists set_updated_at on public.semantic_models;
create trigger set_updated_at before update on public.semantic_models
  for each row execute function app.set_updated_at();
