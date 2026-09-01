-- ============================================================================
-- Atlas Insight AI — 0023 A franquia de créditos passa a vir do PLANO.
--
-- A carteira (migração 0012) já tinha franquia diária, saldo comprado e
-- extrato. Faltava a única coisa que dá sentido a cobrar: `daily_allowance_cents`
-- nascia com o DEFAULT da tabela (200) e nunca mais mudava. Assinar um plano
-- não aumentava nada — o cliente pagava e continuava com a mesma cota do
-- gratuito.
--
-- Aqui a franquia passa a ser um atributo do plano, e a carteira é
-- sincronizada a partir dele. Assinar, trocar de plano ou cancelar refletem
-- na cota sem nenhum passo manual.
--
-- UNIDADE: 1 crédito = 1 centavo de real do custo de IA (provedor + margem).
-- Não é uma moeda inventada: 500 créditos são R$ 5,00 de IA de verdade, o que
-- mantém a conta do produto honesta e o extrato conciliável.
--
-- Idempotente: pode rodar de novo sem efeito.
-- ============================================================================

alter table public.billing_plans
  add column if not exists ai_daily_credits integer not null default 200
    check (ai_daily_credits >= 0);

comment on column public.billing_plans.ai_daily_credits is
  'Créditos de IA por dia incluídos no plano. 1 crédito = 1 centavo de custo real.';

-- Franquia por plano. Valores conservadores de propósito: a camada gratuita
-- dos provedores tem teto diário para a plataforma INTEIRA, então a soma das
-- franquias grátis é o que precisa caber nela.
update public.billing_plans set ai_daily_credits = 500   where id = 'free';
update public.billing_plans set ai_daily_credits = 5000  where id = 'pro';
update public.billing_plans set ai_daily_credits = 20000 where id = 'business';

-- ----------------------------------------------------------------------------
-- Sincroniza a carteira com o plano vigente da organização.
--
-- Cria a carteira se ainda não existir — sem isto, uma organização nova só
-- ganhava carteira no primeiro consumo, e até lá a tela não tinha o que
-- mostrar. Devolve a franquia aplicada.
-- ----------------------------------------------------------------------------
create or replace function public.ai_credits_sync_plan(org uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  allowance integer;
begin
  -- Plano vigente da organização; sem assinatura, vale o gratuito. Assinatura
  -- inativa (em atraso, cancelada, expirada) também cai no gratuito: quem não
  -- está pagando não fica com a franquia de quem paga.
  -- Sem coalesce aqui de propósito: NULL é o sinal de "não tem plano pagante
  -- vigente", e é ele que faz cair na franquia do gratuito logo abaixo.
  -- Coalescendo para um número solto, uma assinatura em atraso ficava com
  -- 200 em vez dos 500 do gratuito — pior que o plano grátis, sem motivo.
  select p.ai_daily_credits
    into allowance
  from public.subscriptions s
  left join public.billing_plans p
    on p.id = s.plan_id and s.status in ('active', 'trialing')
  where s.organization_id = org
  limit 1;

  if allowance is null then
    select ai_daily_credits into allowance from public.billing_plans where id = 'free';
  end if;
  -- Último recurso, se nem o plano gratuito existir na tabela.
  allowance := coalesce(allowance, 200);

  insert into public.ai_credit_wallets (organization_id, daily_allowance_cents)
  values (org, allowance)
  on conflict (organization_id) do update
    set daily_allowance_cents = excluded.daily_allowance_cents,
        updated_at = now()
  where public.ai_credit_wallets.daily_allowance_cents is distinct from excluded.daily_allowance_cents;

  return allowance;
end;
$$;

revoke execute on function public.ai_credits_sync_plan(uuid) from public, anon, authenticated;
grant execute on function public.ai_credits_sync_plan(uuid) to service_role;

-- Carteiras que já existem passam a refletir o plano imediatamente.
do $$
declare o record;
begin
  for o in select id from public.organizations loop
    perform public.ai_credits_sync_plan(o.id);
  end loop;
end $$;
