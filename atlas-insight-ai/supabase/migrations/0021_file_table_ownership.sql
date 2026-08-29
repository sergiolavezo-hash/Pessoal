-- ============================================================================
-- Atlas Insight AI — 0021 De quem é cada tabela de arquivo.
--
-- A tabela física de um upload é derivada do NOME do arquivo, normalizado.
-- Dois nomes diferentes podem cair no mesmo nome normalizado —
-- "Relatorio Vendas.csv" e "relatorio-vendas.xlsx" viram `relatorio_vendas` —
-- e, sem saber de quem é a tabela, a ingestão do segundo arquivo derrubava a
-- tabela do primeiro (drop + recreate) com o conteúdo de outro arquivo. O
-- registro do primeiro continuava PRONTO, e todo modelo e painel montado sobre
-- ele passava a ler dados que não são os dele. Perda silenciosa de dado do
-- cliente.
--
-- Reenviar o MESMO nome continua substituindo, que é o comportamento desejado
-- de atualização. O que esta coluna permite é distinguir "é o mesmo arquivo,
-- pode substituir" de "é outro arquivo, escolha outro nome de tabela".
--
-- Idempotente: pode rodar de novo sem efeito.
-- ============================================================================

alter table public.workspace_files
  add column if not exists catalog_table_id uuid
    references public.catalog_tables (id) on delete set null;

create index if not exists workspace_files_catalog_table_idx
  on public.workspace_files (catalog_table_id)
  where catalog_table_id is not null;

comment on column public.workspace_files.catalog_table_id is
  'Tabela do catálogo alimentada por este arquivo. Nulo em uploads anteriores à 0021: nesse caso o destino volta a ser resolvido só pelo nome.';
