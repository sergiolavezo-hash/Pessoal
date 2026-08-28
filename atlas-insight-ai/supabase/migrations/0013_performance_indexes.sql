-- ============================================================================
-- Atlas Insight AI — 0013 Índices de performance
--
-- Baseado na auditoria dos índices REAIS em produção (pg_indexes) cruzada com
-- os filtros que a aplicação de fato executa. Nenhum índice aqui é
-- especulativo: cada um atende uma consulta existente.
--
-- Observação: em bases já grandes, prefira rodar cada CREATE INDEX com
-- CONCURRENTLY fora de transação. O editor SQL roda tudo numa transação só,
-- onde CONCURRENTLY não é permitido; com o volume atual isso é irrelevante.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 🔴 Tabelas SEM índice na coluna que filtram (varredura sequencial hoje)
-- ----------------------------------------------------------------------------

-- Tabela: workspace_files
-- Consulta: lista de arquivos (.eq workspace_id .order created_at desc)
-- Problema: só existia o índice da chave primária — varredura completa.
create index if not exists idx_workspace_files_ws
  on public.workspace_files (workspace_id, created_at desc);

-- Tabela: business_rules
-- Consulta: contexto da IA (.eq workspace_id .eq status='ACTIVE')
-- Problema: lido em TODA chamada de IA, sem índice.
create index if not exists idx_business_rules_ws_status
  on public.business_rules (workspace_id, status);

-- Tabela: ai_conversations
-- Consulta: histórico do analista (.eq workspace_id .order updated_at desc)
create index if not exists idx_ai_conversations_ws
  on public.ai_conversations (workspace_id, updated_at desc);

-- Tabela: business_documents
-- Consulta: documentos do workspace (.eq workspace_id)
create index if not exists idx_business_documents_ws
  on public.business_documents (workspace_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 🟠 Índice existia, mas não cobria o filtro nem a ordenação
-- ----------------------------------------------------------------------------

-- Tabela: dashboards
-- Consulta: .eq(workspace_id).is(deleted_at,null).order(updated_at desc)
-- Problema: o índice (workspace_id) obrigava a reler e ordenar tudo.
-- Índice parcial: só as linhas vivas, já na ordem apresentada.
create index if not exists idx_dashboards_ws_updated_live
  on public.dashboards (workspace_id, updated_at desc)
  where deleted_at is null;

-- Tabela: data_sources
-- Consulta: .eq(workspace_id).is(deleted_at,null).order(created_at)
create index if not exists idx_data_sources_ws_created_live
  on public.data_sources (workspace_id, created_at)
  where deleted_at is null;

-- Tabela: semantic_models
-- Consulta: .eq(workspace_id).eq(status,'ACTIVE').order(version desc)
-- Problema: o índice (workspace_id) não sabia de status nem de version.
create index if not exists idx_semantic_models_ws_active
  on public.semantic_models (workspace_id, version desc)
  where status = 'ACTIVE';

-- Tabela: metrics
-- Consulta: .eq(workspace_id).is(deleted_at,null).neq(status,'DEPRECATED')
-- O índice único (workspace_id, slug) serve o filtro, mas carrega as
-- excluídas; o parcial mantém apenas o que a aplicação lê.
create index if not exists idx_metrics_ws_live
  on public.metrics (workspace_id)
  where deleted_at is null;

-- ----------------------------------------------------------------------------
-- 🟡 Índices redundantes: o composto já atende, e cada índice extra custa
--    em todo INSERT/UPDATE/DELETE
-- ----------------------------------------------------------------------------

-- catalog_columns (table_id) é prefixo de UNIQUE (table_id, name).
drop index if exists public.idx_catalog_columns_table;

-- organization_members (organization_id) é prefixo de
-- UNIQUE (organization_id, user_id).
drop index if exists public.idx_org_members_org;

-- ----------------------------------------------------------------------------
-- Estatísticas: sem ANALYZE o planejador decide no escuro logo após a criação
-- ----------------------------------------------------------------------------
analyze public.workspace_files;
analyze public.business_rules;
analyze public.ai_conversations;
analyze public.dashboards;
analyze public.data_sources;
analyze public.semantic_models;
analyze public.metrics;
analyze public.catalog_columns;
analyze public.catalog_tables;
