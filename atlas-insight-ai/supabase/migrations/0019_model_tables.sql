-- ============================================================================
-- Atlas Insight AI — 0019 Modelos compostos por TABELAS, não por fontes
--
-- A 0018 ligou o modelo à fonte de dados. O grão está errado, e o efeito é
-- visível no produto: todo arquivo enviado entra na MESMA fonte, chamada
-- "Arquivos enviados" (ver services/file-ingest.ts) — cada planilha vira uma
-- tabela dentro dela. Marcar essa fonte no diálogo puxava todas as planilhas
-- que o cliente já subiu, de uma vez, sem como escolher uma.
--
-- O que o usuário precisa é justamente o contrário: montar um modelo com
-- estas duas tabelas de um banco mais aquele arquivo, ou olhar uma tabela
-- sozinha para fazer um painel só dela.
--
-- Esta migração troca o grão para catalog_tables e reaproveita o que já
-- existe: cada vínculo antigo com uma fonte vira o conjunto das tabelas
-- daquela fonte, então nenhum modelo já criado perde conteúdo.
-- ============================================================================

create table if not exists public.analysis_model_tables (
  model_id uuid not null references public.analysis_models (id) on delete cascade,
  table_id uuid not null references public.catalog_tables (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (model_id, table_id)
);

create index if not exists analysis_model_tables_table_idx
  on public.analysis_model_tables (table_id);

select app.apply_workspace_policies('analysis_model_tables');

-- ----------------------------------------------------------------------------
-- Converte os vínculos existentes: fonte -> todas as tabelas dela
-- ----------------------------------------------------------------------------
insert into public.analysis_model_tables (model_id, table_id, workspace_id)
select amd.model_id, ct.id, amd.workspace_id
  from public.analysis_model_datasets amd
  join public.datasets d on d.data_source_id = amd.data_source_id
  join public.catalog_tables ct on ct.dataset_id = d.id
on conflict (model_id, table_id) do nothing;

-- analysis_model_datasets fica no banco, sem uso, para permitir conferência
-- caso a conversão acima tenha deixado algo de fora. Não deve ser lida pela
-- aplicação: duas fontes de verdade para a mesma pergunta viram divergência.
comment on table public.analysis_model_datasets is
  'Obsoleta desde a 0019. A composição do modelo vive em analysis_model_tables.';
