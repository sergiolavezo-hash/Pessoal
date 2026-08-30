-- ============================================================================
-- Atlas Insight AI — 0022 O bucket passa a cobrar o limite que a tela anuncia.
--
-- A tela diz "Envie arquivos CSV e XLSX de até 50 MB" e src/lib/uploads.ts
-- recusa acima disso — mas essa recusa é do NAVEGADOR e do servidor DEPOIS do
-- upload. Desde que o arquivo passou a ir direto do navegador para o Storage
-- por URL assinada, quem de fato recebe os bytes é o bucket, e ele foi criado
-- na 0005 sem file_size_limit: herdava o teto global do projeto, que nada aqui
-- fixa. O número anunciado e o número cobrado eram dois números diferentes.
--
-- allowed_mime_types fica NULO de propósito: navegador e sistema operacional
-- discordam do MIME de CSV e XLSX com frequência (text/csv, application/csv,
-- application/vnd.ms-excel, e vazio no iOS). Barrar por MIME recusaria arquivo
-- bom; a extensão já é conferida em uploadRejection, nos dois lados.
--
-- Idempotente: pode rodar de novo sem efeito.
-- ============================================================================

update storage.buckets
set file_size_limit = 52428800 -- 50 MiB, o mesmo MAX_FILE_BYTES de src/lib/uploads.ts
where id = 'workspace-files'
  and (file_size_limit is distinct from 52428800);
