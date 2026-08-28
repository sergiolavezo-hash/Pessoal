-- ============================================================================
-- Atlas Insight AI — 0018 Dataset publicado e Modelos
--
-- Nota de nomenclatura: já existe uma tabela `datasets` desde a 0002, mas ela
-- é um NAMESPACE — agrupa catalog_tables dentro de uma fonte, como um schema
-- de banco. O "Dataset" do produto (a base publicada, com qualidade, versão e
-- atualização) corresponde a `data_sources`. Em vez de criar uma terceira
-- entidade e confundir as três, esta migração acrescenta a data_sources o que
-- falta para ela ser um Dataset publicado de verdade.
--
-- Três ideias sustentam o desenho:
--
--   1. NOME É DO USUÁRIO, VERSÃO É TÉCNICA. Quem usa vê "Vendas"; o número da
--      revisão existe para auditoria e rollback, e não aparece na interface.
--   2. REFRESH É ATÔMICO. Uma importação nova só substitui a publicada depois
--      de passar no portão de qualidade. Falhou, a anterior continua no ar.
--   3. MODELO REFERENCIA, NÃO COPIA. Um dataset participa de vários modelos
--      sem que o dado seja duplicado uma única vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Dataset publicado: qualidade, versão e atualização
-- ----------------------------------------------------------------------------
alter table public.data_sources
  -- Revisão interna. Nunca exibida ao usuário; serve para auditoria,
  -- rollback e para invalidar cache de forma precisa.
  add column if not exists revision integer not null default 1,
  -- Nota do portão de qualidade (0..100), calculada sem IA.
  add column if not exists quality_score integer
    check (quality_score is null or (quality_score between 0 and 100)),
  add column if not exists quality_problems jsonb not null default '[]'::jsonb,
  -- Publicado = pronto para virar painel. Uma fonte conectada mas reprovada
  -- na qualidade existe, aparece na lista e explica o que corrigir.
  add column if not exists published_at timestamptz,
  add column if not exists row_count bigint,
  add column if not exists column_count integer,
  -- Impressão digital do conteúdo da última importação bem-sucedida: permite
  -- responder "nada mudou" sem reprocessar.
  add column if not exists content_hash text,
  add column if not exists last_refresh_at timestamptz,
  add column if not exists next_refresh_at timestamptz,
  -- manual | hourly | daily | weekly
  add column if not exists refresh_schedule text
    check (refresh_schedule is null or refresh_schedule in ('manual', 'hourly', 'daily', 'weekly'));

-- Estado legível, separado do status técnico de conexão. Um é sobre a
-- ligação com a origem; este é sobre os dados que o usuário vê.
alter table public.data_sources
  add column if not exists dataset_status text not null default 'DRAFT'
    check (dataset_status in (
      'DRAFT',            -- importado, ainda não publicado
      'PUBLISHED',        -- 🟢 atualizado e disponível
      'REFRESHING',       -- 🔄 atualizando
      'CHANGE_DETECTED',  -- 🟡 a origem mudou
      'SCHEMA_CHANGED',   -- ⚠️ colunas mudaram; pode afetar painéis
      'QUALITY_BLOCKED',  -- 🔴 reprovado no portão de qualidade
      'ERROR'             -- 🔴 falha na importação
    ));

create index if not exists data_sources_dataset_status_idx
  on public.data_sources (workspace_id, dataset_status);

-- ----------------------------------------------------------------------------
-- Histórico de importações
--
-- Cada tentativa vira uma linha, inclusive as recusadas. É o que permite
-- responder "por que meus dados não atualizaram?" sem adivinhação.
-- ----------------------------------------------------------------------------
create table if not exists public.dataset_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  data_source_id uuid not null references public.data_sources (id) on delete cascade,
  revision integer not null,
  status text not null check (status in ('RUNNING', 'PUBLISHED', 'REJECTED', 'FAILED', 'UNCHANGED')),
  -- Por que foi recusada, em linguagem de usuário.
  reason text,
  quality_score integer check (quality_score is null or (quality_score between 0 and 100)),
  quality_problems jsonb not null default '[]'::jsonb,
  row_count bigint,
  column_count integer,
  content_hash text,
  -- Diferenças de esquema em relação à revisão publicada.
  schema_changes jsonb not null default '{}'::jsonb,
  duration_ms integer,
  created_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (data_source_id, revision)
);

create index if not exists dataset_revisions_source_idx
  on public.dataset_revisions (data_source_id, started_at desc);

select app.apply_workspace_policies('dataset_revisions');

-- ----------------------------------------------------------------------------
-- Modelos: conjuntos de datasets nomeados pelo usuário
-- ----------------------------------------------------------------------------
create table if not exists public.analysis_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Nome humano: "Modelo Comercial". Nunca carrega número de versão.
  name text not null,
  description text,
  -- Revisão interna, para auditoria. Não aparece na interface.
  revision integer not null default 1,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index if not exists analysis_models_ws_idx
  on public.analysis_models (workspace_id, status, updated_at desc);

select app.apply_workspace_policies('analysis_models');

drop trigger if exists set_updated_at on public.analysis_models;
create trigger set_updated_at before update on public.analysis_models
  for each row execute function app.set_updated_at();

-- ----------------------------------------------------------------------------
-- Quais datasets pertencem a cada modelo
--
-- Referência, nunca cópia: o mesmo dataset participa de vários modelos e o
-- dado continua existindo uma única vez.
-- ----------------------------------------------------------------------------
create table if not exists public.analysis_model_datasets (
  model_id uuid not null references public.analysis_models (id) on delete cascade,
  data_source_id uuid not null references public.data_sources (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (model_id, data_source_id)
);

create index if not exists analysis_model_datasets_source_idx
  on public.analysis_model_datasets (data_source_id);

select app.apply_workspace_policies('analysis_model_datasets');

-- ----------------------------------------------------------------------------
-- Publicação atômica de uma revisão
--
-- O ponto todo: a revisão nova só vira a publicada se passar no portão de
-- qualidade. Reprovada, a anterior continua exatamente como estava — o
-- usuário nunca fica sem base porque um arquivo ruim foi enviado por cima.
-- ----------------------------------------------------------------------------
create or replace function public.publish_dataset_revision(
  source uuid,
  score integer,
  problems jsonb default '[]'::jsonb,
  rows_count bigint default null,
  cols_count integer default null,
  hash text default null,
  min_score integer default 50,
  schema_diff jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
declare
  ds public.data_sources;
  next_revision integer;
  approved boolean;
  new_status text;
begin
  select * into ds from public.data_sources where id = source for update;
  if ds is null then
    return jsonb_build_object('published', false, 'reason', 'source_not_found');
  end if;

  if not app.is_workspace_member(ds.workspace_id) then
    return jsonb_build_object('published', false, 'reason', 'not_a_member');
  end if;

  next_revision := ds.revision + 1;
  approved := coalesce(score, 0) >= min_score;

  -- Esquema alterado é aviso, não reprovação: os dados valem, mas painéis
  -- que usavam uma coluna removida precisam ser revistos.
  new_status := case
    when not approved then 'QUALITY_BLOCKED'
    when schema_diff <> '{}'::jsonb then 'SCHEMA_CHANGED'
    else 'PUBLISHED'
  end;

  insert into public.dataset_revisions (
    workspace_id, data_source_id, revision, status, quality_score,
    quality_problems, row_count, column_count, content_hash, schema_changes,
    reason, finished_at
  ) values (
    ds.workspace_id, source, next_revision,
    case when approved then 'PUBLISHED' else 'REJECTED' end,
    score, problems, rows_count, cols_count, hash, schema_diff,
    case when approved then null
         else 'A nova versão não passou na verificação de qualidade e não substituiu a versão atual.'
    end,
    now()
  );

  if not approved then
    -- Só o estado muda; os dados publicados seguem sendo os de antes.
    update public.data_sources
       set dataset_status = 'QUALITY_BLOCKED',
           quality_score = score,
           quality_problems = problems,
           updated_at = now()
     where id = source;
    return jsonb_build_object(
      'published', false, 'reason', 'quality_blocked',
      'score', score, 'problems', problems, 'revision', ds.revision
    );
  end if;

  update public.data_sources
     set revision = next_revision,
         dataset_status = new_status,
         quality_score = score,
         quality_problems = problems,
         row_count = coalesce(rows_count, row_count),
         column_count = coalesce(cols_count, column_count),
         content_hash = coalesce(hash, content_hash),
         published_at = coalesce(published_at, now()),
         last_refresh_at = now(),
         updated_at = now()
   where id = source;

  -- Dados novos tornam obsoleta qualquer resposta guardada deste workspace.
  perform public.ai_cache_invalidate(ds.workspace_id);

  return jsonb_build_object(
    'published', true, 'revision', next_revision,
    'status', new_status, 'score', score
  );
end;
$$;

revoke execute on function public.publish_dataset_revision(uuid, integer, jsonb, bigint, integer, text, integer, jsonb) from public, anon;
grant execute on function public.publish_dataset_revision(uuid, integer, jsonb, bigint, integer, text, integer, jsonb) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- "Nada mudou": responde sem reprocessar
-- ----------------------------------------------------------------------------
create or replace function public.dataset_content_unchanged(source uuid, hash text)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1 from public.data_sources
     where id = source
       and content_hash is not null
       and content_hash = hash
       and app.is_workspace_member(workspace_id)
  );
$$;

revoke execute on function public.dataset_content_unchanged(uuid, text) from public, anon;
grant execute on function public.dataset_content_unchanged(uuid, text) to authenticated, service_role;
