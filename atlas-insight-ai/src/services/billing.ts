import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/services/api-context";
import type { BillingPlan, PaymentTransaction, Subscription, TrialVerdict } from "@/types";

/**
 * Billing service. Product rule: the free trial lasts 14 days OR
 * 1 dashboard run — whichever ends first. Paid plans are monthly or
 * yearly. All gating decisions are made atomically in the database
 * (see supabase/migrations/0007_billing.sql); this module is the only
 * place the rest of the app talks to those RPCs and tables.
 */

export async function getSubscription(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as Subscription | null) ?? null;
}

export async function listPlans(supabase: SupabaseClient): Promise<BillingPlan[]> {
  const { data } = await supabase
    .from("billing_plans")
    .select("*")
    .eq("active", true)
    .order("price_monthly_cents", { ascending: true, nullsFirst: false });
  return (data ?? []) as BillingPlan[];
}

export async function listTransactions(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 20
): Promise<PaymentTransaction[]> {
  const { data } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PaymentTransaction[];
}

/** Read-only check — does not consume anything. */
export async function canRunDashboard(
  supabase: SupabaseClient,
  organizationId: string
): Promise<TrialVerdict> {
  const { data, error } = await supabase.rpc("can_run_dashboard", { org: organizationId });
  if (error) throw new ApiError(500, `Billing check failed: ${error.message}`);
  return data as TrialVerdict;
}

/** Atomically consumes one trial dashboard run (no-op for active plans). */
export async function consumeDashboardRun(
  supabase: SupabaseClient,
  workspaceId: string,
  dashboardId?: string
): Promise<TrialVerdict> {
  const { data, error } = await supabase.rpc("consume_dashboard_run", {
    ws: workspaceId,
    dash: dashboardId ?? null,
  });
  if (error) throw new ApiError(500, `Billing consume failed: ${error.message}`);
  return data as TrialVerdict;
}

export const TRIAL_BLOCK_MESSAGES: Record<string, string> = {
  trial_time_expired:
    "Your free trial has ended. Choose a monthly or yearly plan to keep generating dashboards.",
  trial_runs_exhausted:
    "Your free trial dashboard run has been used. Subscribe to generate unlimited dashboards.",
  no_subscription: "No subscription found for this organization.",
  canceled: "Your subscription is canceled. Reactivate it to continue.",
  past_due: "Your last payment failed. Update your payment method to continue.",
  expired: "Your subscription has expired. Subscribe to continue.",
  incomplete: "Your checkout was not completed. Finish it to activate your plan.",
};

/** Throws 402 with a friendly message when the verdict blocks the action. */
export function assertAllowed(verdict: TrialVerdict): void {
  if (verdict.allowed) return;
  const message =
    TRIAL_BLOCK_MESSAGES[verdict.reason] ?? `Action not allowed (${verdict.reason}).`;
  throw new ApiError(402, message);
}
