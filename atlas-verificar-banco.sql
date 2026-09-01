-- ============================================================================
-- Atlas Insight AI — Conferência do banco
--
-- Diz, em uma tabela, quais migrações JÁ ESTÃO no banco e quais faltam. Não
-- altera nada: pode rodar a qualquer momento, em produção, sem risco.
--
-- Por que existe: a pasta supabase/migrations lista o que DEVERIA estar
-- aplicado, mas ninguém garante que foi — e rodar de novo uma migração já
-- aplicada, na dúvida, é como o erro acontece. Aqui a resposta vem do próprio
-- banco: cada linha procura o OBJETO que a migração cria, não um registro de
-- que ela rodou.
--
-- Como usar: cole no SQL Editor do Supabase e execute. Toda linha deve dizer
-- APLICADA. Qualquer PENDENTE é o arquivo correspondente em
-- supabase/migrations/ para rodar, na ordem numérica.
-- ============================================================================

with verificacoes(migracao, o_que_procura, aplicada) as (
  values
    ('0012_ai_credits',
     'tabela ai_credit_wallets',
     to_regclass('public.ai_credit_wallets') is not null),

    ('0013_performance_indexes',
     'índice idx_dashboards_ws_updated_live',
     exists (select 1 from pg_indexes
             where schemaname = 'public' and indexname = 'idx_dashboards_ws_updated_live')),

    ('0014_credits_service_role_only',
     'ai_credits_status SEM permissão para authenticated',
     to_regprocedure('public.ai_credits_status(uuid)') is not null
       and not has_function_privilege('authenticated', 'public.ai_credits_status(uuid)', 'execute')),

    ('0015_fix_trial_run_race',
     'consume_dashboard_run com trava de linha (FOR UPDATE)',
     exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'consume_dashboard_run'
               and pg_get_functiondef(p.oid) ilike '%for update%')),

    ('0016_ai_gateway',
     'tabela ai_tenant_usage',
     to_regclass('public.ai_tenant_usage') is not null),

    ('0017_file_dedup_cache_invalidation',
     'função ai_cache_invalidate',
     to_regprocedure('public.ai_cache_invalidate(uuid, text)') is not null
       or exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'ai_cache_invalidate')),

    ('0018_datasets_models',
     'função publish_dataset_revision',
     exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'publish_dataset_revision')),

    ('0019_model_tables',
     'tabela analysis_model_tables',
     to_regclass('public.analysis_model_tables') is not null),

    ('0020_semantic_overrides',
     'catalog_columns com display_name, description e role_override',
     (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'catalog_columns'
        and column_name in ('display_name', 'description', 'role_override')) = 3),

    ('0021_file_table_ownership',
     'workspace_files.catalog_table_id',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'workspace_files'
               and column_name = 'catalog_table_id')),

    ('0022_bucket_size_limit',
     'bucket workspace-files com teto de 50 MiB',
     exists (select 1 from storage.buckets
             where id = 'workspace-files' and file_size_limit = 52428800))
)
select
  migracao,
  case when aplicada then 'APLICADA' else 'PENDENTE  <<< rodar este arquivo' end as situacao,
  o_que_procura
from verificacoes
order by migracao;
