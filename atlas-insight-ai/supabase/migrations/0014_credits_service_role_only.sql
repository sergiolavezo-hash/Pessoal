-- ============================================================================
-- Atlas Insight AI — 0014 Carteira de créditos: apenas service role
--
-- ai_credits_status é SECURITY DEFINER e recebe a organização por PARÂMETRO.
-- Com permissão para `authenticated`, qualquer usuário logado podia consultar
-- o saldo de OUTRA organização informando o id dela. O servidor passou a
-- chamar a função com o service role (a tela lê o saldo da própria conta
-- pelo servidor), então a permissão ampla deixou de ser necessária.
-- ============================================================================

revoke execute on function public.ai_credits_status(uuid) from public, anon, authenticated;
grant execute on function public.ai_credits_status(uuid) to service_role;
