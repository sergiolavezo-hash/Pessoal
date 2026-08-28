-- ============================================================================
-- Atlas Insight AI — 0015 Corrige corrida no limite de execuções do trial
--
-- consume_dashboard_run() chamava can_run_dashboard(org) (um SELECT sem lock)
-- e só depois fazia o UPDATE que incrementa trial_dashboard_runs_used. Duas
-- requisições simultâneas (duplo clique em "gerar painel", uma aba antiga
-- reenviando, um retry de rede) liam o mesmo contador antes de qualquer uma
-- delas incrementar, então ambas recebiam 'allowed = true' e cada uma criava
-- sua própria execução de IA — o limite de 1 execução por trial nunca
-- travava de fato. Dados reais de produção mostram exatamente esse padrão:
-- workspaces em trial com várias execuções de dashboard_generate bem-
-- sucedidas, quando o esperado era no máximo uma.
--
-- A correção trava a linha da assinatura (select ... for update) antes de
-- checar e incrementar, tudo dentro da mesma função — fechando a janela
-- entre "ler o contador" e "gravar o novo valor".
-- ============================================================================

create or replace function public.consume_dashboard_run(ws uuid, dash text default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  org uuid;
  s public.subscriptions;
  verdict jsonb;
begin
  select w.organization_id into org from public.workspaces w where w.id = ws;
  if org is null then
    return jsonb_build_object('allowed', false, 'reason', 'workspace_not_found');
  end if;

  if not app.is_org_member(org) then
    return jsonb_build_object('allowed', false, 'view_allowed', false, 'reason', 'not_a_member');
  end if;

  -- Trava a linha da assinatura: uma segunda chamada concorrente espera
  -- aqui até a primeira terminar, e então já vê o contador atualizado.
  select * into s from public.subscriptions where organization_id = org for update;
  if s is null then
    return jsonb_build_object('allowed', false, 'view_allowed', false, 'reason', 'no_subscription');
  end if;

  if s.status = 'active' then
    verdict := jsonb_build_object('allowed', true, 'view_allowed', true, 'reason', 'active_subscription');
  elsif s.status = 'trialing' then
    if now() > s.trial_ends_at then
      verdict := jsonb_build_object('allowed', false, 'view_allowed', false, 'reason', 'trial_time_expired');
    elsif s.trial_dashboard_runs_used >= s.trial_dashboard_runs_limit then
      verdict := jsonb_build_object('allowed', false, 'view_allowed', true, 'reason', 'trial_runs_exhausted');
    else
      verdict := jsonb_build_object(
        'allowed', true, 'view_allowed', true, 'reason', 'trialing',
        'runs_remaining', s.trial_dashboard_runs_limit - s.trial_dashboard_runs_used - 1,
        'trial_ends_at', s.trial_ends_at
      );
    end if;
  else
    verdict := jsonb_build_object('allowed', false, 'view_allowed', false, 'reason', s.status);
  end if;

  if not (verdict ->> 'allowed')::boolean then
    return verdict;
  end if;

  update public.subscriptions
  set trial_dashboard_runs_used = trial_dashboard_runs_used + 1, updated_at = now()
  where organization_id = org and status = 'trialing';

  insert into public.usage_events (organization_id, workspace_id, user_id, event_type, metadata)
  values (org, ws, auth.uid(), 'dashboard_run',
          jsonb_build_object('dashboard_id', dash));

  return verdict;
end;
$$;
