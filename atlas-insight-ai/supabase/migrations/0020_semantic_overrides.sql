-- ============================================================================
-- Atlas Insight AI — 0020 Correções do usuário sobre o modelo semântico
--
-- O Atlas lê a estrutura e adivinha: nomeia a tabela pelo identificador físico
-- ("query_resultado_rebp00003809") e classifica cada coluna como valor, data
-- ou categoria olhando os dados. Acerta bastante, mas quem conhece o negócio
-- é o cliente — e hoje ele não tem como corrigir.
--
-- Isso não é só cosmético: o rótulo da tabela e o papel de cada coluna vão
-- para o prompt da IA. Uma coluna classificada como categoria quando é valor
-- faz o painel contar registros em vez de somar dinheiro.
--
-- DECISÃO CENTRAL: a correção vive em colunas PRÓPRIAS, separadas do que o
-- perfilador escreve. Guardá-la dentro de `classification` faria a próxima
-- atualização de dados apagar em silêncio o que o usuário corrigiu — ele
-- arrumaria a mesma coluna toda semana sem entender por quê.
-- ============================================================================

alter table public.catalog_tables
  -- Nome que o usuário entende. O identificador físico continua em `name`,
  -- porque é ele que o SQL precisa referenciar.
  add column if not exists display_name text,
  add column if not exists description text;

alter table public.catalog_columns
  add column if not exists display_name text,
  add column if not exists description text,
  -- Papel definido pelo usuário. Vence o do perfilador quando presente.
  add column if not exists role_override text
    check (role_override is null or role_override in (
      'MEASURE', 'DATE', 'CATEGORY', 'DIMENSION', 'BOOLEAN', 'TEXT', 'ID', 'FOREIGN_KEY'
    ));

-- Consulta do editor: todas as colunas de uma tabela, na ordem original.
create index if not exists catalog_columns_table_ordinal_idx
  on public.catalog_columns (table_id, ordinal);
