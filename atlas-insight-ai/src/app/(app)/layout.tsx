import Link from "next/link";
import { cookies } from "next/headers";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, listPlans } from "@/services/billing";
import { getCreditStatus, toCredits } from "@/services/ai-credits";
import { AppShell } from "@/components/layout/app-shell";
import { SIDEBAR_COLLAPSED, SIDEBAR_COOKIE } from "@/lib/ui-preferences";
import { buildRef } from "@/lib/build-info";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  const supabase = await createClient();
  const [subscription, plans, credits] = await Promise.all([
    getSubscription(supabase, ctx.organization.id),
    listPlans(supabase),
    getCreditStatus(ctx.organization.id),
  ]);
  // Lido no servidor para a primeira pintura já sair no estado escolhido.
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === SIDEBAR_COLLAPSED;

  const trial =
    subscription?.status === "trialing"
      ? {
          daysLeft: Math.max(
            0,
            Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86_400_000)
          ),
          runsLeft: Math.max(
            0,
            subscription.trial_dashboard_runs_limit - subscription.trial_dashboard_runs_used
          ),
        }
      : null;
  const blocked =
    subscription != null &&
    ["past_due", "canceled", "expired", "incomplete"].includes(subscription.status);

  return (
    <AppShell
      profile={ctx.profile}
      organization={ctx.organization}
      workspaces={ctx.workspaces}
      workspace={ctx.workspace}
      role={ctx.role}
      initialCollapsed={collapsed}
      buildRef={buildRef()}
      credits={{
        planName: plans.find((p) => p.id === subscription?.plan_id)?.name ?? "Gratuito",
        allowance: toCredits(credits.daily_allowance_cents),
        remaining: toCredits(credits.daily_remaining_cents),
        extraBalance: toCredits(credits.balance_cents),
      }}
      banners={
        <>
          {trial && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning/10 px-6 py-2 text-sm lg:px-8">
              <span>
                <strong>Teste gratuito:</strong> {trial.daysLeft} dia
                {trial.daysLeft === 1 ? "" : "s"} e {trial.runsLeft} pain
                {trial.runsLeft === 1 ? "el" : "éis"} restante
                {trial.runsLeft === 1 ? "" : "s"}.
              </span>
              <Link href="/settings/billing" className="font-medium text-primary hover:underline">
                Escolher um plano →
              </Link>
            </div>
          )}
          {blocked && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm lg:px-8">
              <span>
                <strong>Assinatura inativa.</strong> A geração de painéis e o acesso aos dados
                estão pausados.
              </span>
              <Link href="/settings/billing" className="font-medium text-primary hover:underline">
                Regularizar →
              </Link>
            </div>
          )}
        </>
      }
    >
      {children}
    </AppShell>
  );
}
