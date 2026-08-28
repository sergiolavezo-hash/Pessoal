import { getAppContext } from "@/services/context";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, listPlans, listTransactions } from "@/services/billing";
import { CREDIT_PACKS, getCreditStatus } from "@/services/ai-credits";
import { CreditWallet } from "@/features/billing/credit-wallet";
import {
  BillingAnalytics,
  ManageSubscriptionButton,
  PlanCheckoutButtons,
} from "@/features/billing/checkout-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Cobrança" };

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  active: { label: "Active", variant: "success" },
  trialing: { label: "Teste gratuito", variant: "warning" },
  past_due: { label: "Past due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "secondary" },
  incomplete: { label: "Incomplete", variant: "secondary" },
  expired: { label: "Expired", variant: "destructive" },
};

function brl(cents: number | null): string {
  if (cents == null) return "Contact us";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(iso));
}

export default async function BillingPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();

  const [subscription, plans, transactions, credits] = await Promise.all([
    getSubscription(supabase, ctx.organization.id),
    listPlans(supabase),
    listTransactions(supabase, ctx.organization.id),
    getCreditStatus(ctx.organization.id),
  ]);

  const status = STATUS_LABEL[subscription?.status ?? ""] ?? {
    label: "No subscription",
    variant: "secondary" as const,
  };
  const runsLeft = subscription
    ? Math.max(0, subscription.trial_dashboard_runs_limit - subscription.trial_dashboard_runs_used)
    : 0;
  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : 0;

  const canManage = ["OWNER", "ADMIN"].includes(ctx.role);

  return (
    <div>
      <Suspense>
        <BillingAnalytics />
      </Suspense>
      <PageHeader
        title="Plano e cobrança"
        description="Assinatura, situação do teste gratuito e histórico de compras."
      />

      <div className="mb-6">
        <CreditWallet
          workspaceId={ctx.workspace.id}
          state={{
            dailyAllowanceCents: credits.daily_allowance_cents,
            dailyRemainingCents: credits.daily_remaining_cents,
            balanceCents: credits.balance_cents,
          }}
          packs={CREDIT_PACKS.map((p) => ({
            id: p.id,
            name: p.name,
            priceCents: p.priceCents,
            creditCents: p.creditCents,
          }))}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Current status</CardTitle>
            <div className="flex items-center gap-2">
              {canManage && subscription?.external_customer_id && (
                <ManageSubscriptionButton organizationId={ctx.organization.id} />
              )}
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </div>
          {subscription?.status === "trialing" && (
            <CardDescription>
              The free trial lasts 14 days <em>or</em> 1 dashboard run — whichever ends first. You
              have <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"}</strong> and{" "}
              <strong>{runsLeft} dashboard run{runsLeft === 1 ? "" : "s"}</strong> remaining
              (ends {fmtDate(subscription.trial_ends_at)}). After that, pick a monthly or yearly
              plan to continue.
            </CardDescription>
          )}
          {subscription?.status === "active" && (
            <CardDescription>
              {subscription.billing_interval === "yearly" ? "Yearly" : "Monthly"} subscription —
              next renewal {fmtDate(subscription.current_period_end)}.
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.id === "pro" ? "border-primary/50" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{plan.name}</CardTitle>
                {plan.id === "pro" && <Badge>Recommended</Badge>}
              </div>
              <CardDescription>
                {plan.price_monthly_cents === 0
                  ? "14-day trial or 1 dashboard run"
                  : plan.price_monthly_cents == null
                    ? "Custom pricing for large teams"
                    : `${brl(plan.price_monthly_cents)}/month · ${brl(plan.price_yearly_cents)}/year`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanCheckoutButtons
                organizationId={ctx.organization.id}
                planId={plan.id as "free" | "pro" | "business"}
                monthlyLabel={plan.price_monthly_cents ? `${brl(plan.price_monthly_cents)}/mo` : null}
                yearlyLabel={plan.price_yearly_cents ? `${brl(plan.price_yearly_cents)}/yr` : null}
                isCurrent={subscription?.plan_id === plan.id}
                canManage={["OWNER", "ADMIN"].includes(ctx.role)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Pagamento processado pelo Stripe (certificação PCI-DSS): dados de cartão nunca passam pela
        Atlas. Em conformidade com a LGPD, armazenamos apenas identificadores da transação, valores
        e notas — nada além do necessário para a cobrança.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Purchase history</CardTitle>
          <CardDescription>
            Every charge for {ctx.organization.name}. Secure checkout, invoices and the customer
            portal are handled by Stripe once billing goes live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.description ?? "Payment"}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "succeeded" ? "success" : "secondary"}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{brl(t.amount_cents)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDate(t.paid_at ?? t.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
