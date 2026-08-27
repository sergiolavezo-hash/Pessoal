import Link from "next/link";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/services/billing";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  const supabase = await createClient();
  const subscription = await getSubscription(supabase, ctx.organization.id);

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
    <div className="flex min-h-screen">
      <AppSidebar
        profile={ctx.profile}
        organization={ctx.organization}
        workspaces={ctx.workspaces}
        workspace={ctx.workspace}
        role={ctx.role}
      />
      <main className="min-w-0 flex-1 bg-background">
        {trial && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning/10 px-6 py-2 text-sm lg:px-8">
            <span>
              <strong>Free trial:</strong> {trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} and{" "}
              {trial.runsLeft} dashboard run{trial.runsLeft === 1 ? "" : "s"} remaining.
            </span>
            <Link href="/settings/billing" className="font-medium text-primary hover:underline">
              Choose a plan →
            </Link>
          </div>
        )}
        {blocked && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm lg:px-8">
            <span>
              <strong>Subscription inactive.</strong> Dashboard generation and data access are
              paused.
            </span>
            <Link href="/settings/billing" className="font-medium text-primary hover:underline">
              Fix billing →
            </Link>
          </div>
        )}
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
