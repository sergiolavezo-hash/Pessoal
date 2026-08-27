import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name, slug)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const org = membership.organizations as unknown as { name: string; slug: string } | null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, trial_dashboard_runs_used, trial_dashboard_runs_limit")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  const trialBanner =
    subscription?.status === "TRIALING"
      ? {
          daysLeft: Math.max(
            0,
            Math.ceil(
              (new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86_400_000
            )
          ),
          runsLeft: Math.max(
            0,
            subscription.trial_dashboard_runs_limit - subscription.trial_dashboard_runs_used
          ),
        }
      : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org?.name ?? "Organização"} userEmail={user.email ?? ""} />
      <div className="flex min-w-0 flex-1 flex-col">
        {trialBanner && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/20 bg-accent/5 px-6 py-2.5 text-sm text-ink">
            <span>
              <strong className="text-accent">Teste gratuito:</strong>{" "}
              {trialBanner.daysLeft} {trialBanner.daysLeft === 1 ? "dia" : "dias"} restantes ·{" "}
              {trialBanner.runsLeft}{" "}
              {trialBanner.runsLeft === 1 ? "execução de dashboard" : "execuções de dashboard"}
            </span>
            <Link
              href="/settings/billing"
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              Assinar agora →
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
