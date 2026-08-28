-- ============================================================================
-- Atlas Insight AI — 0011 Contextos de análise (estilo Looker)
-- Cada tabela catalogada pertence a um contexto (assunto). Uploads são
-- agrupados automaticamente por afinidade de colunas; a geração de
-- dashboards pode usar um contexto isolado ou todos juntos.
-- ============================================================================

alter table public.catalog_tables add column if not exists context text;

-- Backfill: cada tabela existente vira seu próprio contexto por padrão.
-- (Uploads futuros são agrupados automaticamente por afinidade de colunas.)
update public.catalog_tables set context = name where context is null;
