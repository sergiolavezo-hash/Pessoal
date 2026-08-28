-- ============================================================================
-- Atlas Insight AI — 0017 Deduplicação de arquivos e invalidação de cache
--
-- Dois desperdícios diferentes, com a mesma raiz: reprocessar o que já se
-- sabe, e responder com o que já não vale.
--
--   1. o mesmo arquivo enviado de novo era importado de novo — parse, perfil,
--      modelo semântico e, quando o layout parecia bagunçado, uma chamada de
--      IA. Tudo para chegar exatamente ao dataset que já existia;
--   2. o cache de respostas de IA (0016) expira por tempo, mas não sabia
--      quando os DADOS mudavam. Depois de um refresh, uma pergunta repetida
--      podia devolver a resposta antiga — e responder errado é pior que
--      gastar token.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Impressão digital do conteúdo do arquivo
-- ----------------------------------------------------------------------------
alter table public.workspace_files
  add column if not exists content_hash text;

-- A duplicidade é avaliada DENTRO do workspace: o "vendas.xlsx" de um cliente
-- não pode bloquear o arquivo homônimo de outro. O índice é parcial porque
-- arquivos antigos (anteriores a esta migração) não têm hash e não devem
-- colidir entre si.
create index if not exists workspace_files_hash_idx
  on public.workspace_files (workspace_id, content_hash)
  where content_hash is not null;

-- ----------------------------------------------------------------------------
-- Invalidação do cache de IA por workspace
--
-- Chamada quando os dados mudam (novo arquivo, refresh, novo perfil). Apaga
-- as respostas guardadas daquele workspace — e só daquele.
-- ----------------------------------------------------------------------------
create or replace function public.ai_cache_invalidate(ws uuid)
returns integer
language plpgsql
security definer
set search_path = public, app
as $$
declare
  removed integer;
begin
  delete from public.ai_response_cache where workspace_id = ws;
  get diagnostics removed = row_count;

  -- A sugestão de prompt (0012) também descreve o esquema: se ele mudou, a
  -- sugestão guardada passa a citar colunas que podem não existir mais.
  delete from public.ai_suggestion_cache where workspace_id = ws;

  return removed;
end;
$$;

revoke execute on function public.ai_cache_invalidate(uuid) from public, anon, authenticated;
grant execute on function public.ai_cache_invalidate(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- Limpeza das entradas vencidas
--
-- Sem isto a tabela cresce para sempre: entradas vencidas nunca são lidas
-- (a aplicação compara expires_at) mas continuam ocupando espaço.
-- ----------------------------------------------------------------------------
create or replace function public.ai_cache_purge_expired()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.ai_response_cache where expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.ai_cache_purge_expired() from public, anon, authenticated;
grant execute on function public.ai_cache_purge_expired() to service_role;
