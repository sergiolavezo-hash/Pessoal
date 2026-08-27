import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate } from "@/lib/utils";

export const metadata = { title: "Plano & cobrança" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Em teste gratuito",
  ACTIVE: "Assinatura ativa",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  INCOMPLETE: "Incompleta",
  EXPIRED: "Expirada",
};

export default async function BillingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user?.id ?? "")
    .limit(1)
    .maybeSingle();

  const orgId = membership?.organization_id;

  const [{ data: subscription }, { data: plans }, { data: payments }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("organization_id", orgId ?? "").maybeSingle(),
    supabase
      .from("billing_plans")
      .select("*")
      .eq("active", true)
      .order("price_monthly_cents", { ascending: true, nullsFirst: false }),
    supabase
      .from("payment_transactions")
      .select("amount_cents, currency, status, description, paid_at, created_at")
      .eq("organization_id", orgId ?? "")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const runsLeft = subscription
    ? Math.max(0, subscription.trial_dashboard_runs_limit - subscription.trial_dashboard_runs_used)
    : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Plano &amp; cobrança</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Situação atual</CardTitle>
            <Badge variant={subscription?.status === "ACTIVE" ? "default" : "warning"}>
              {STATUS_LABEL[subscription?.status ?? ""] ?? "Sem assinatura"}
            </Badge>
          </div>
          {subscription?.status === "TRIALING" && (
            <CardDescription>
              Seu teste gratuito termina em {formatDate(subscription.trial_ends_at)} — ou ao usar a
              última execução de dashboard incluída ({runsLeft} restante
              {runsLeft === 1 ? "" : "s"}). Depois disso, escolha um plano mensal ou anual para
              continuar.
            </CardDescription>
          )}
          {subscription?.status === "ACTIVE" && subscription.current_period_end && (
            <CardDescription>
              Próxima renovação em {formatDate(subscription.current_period_end)} (
              {subscription.billing_interval === "YEARLY" ? "anual" : "mensal"}).
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(plans ?? []).map((plan) => (
          <Card
            key={plan.id}
            className={plan.id === "pro" ? "border-accent/40" : undefined}
          >
            <CardHeader>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <CardDescription>
                {plan.price_monthly_cents === 0
                  ? "Teste de 14 dias ou 1 execução"
                  : plan.price_monthly_cents == null
                    ? "Sob consulta"
                    : `${formatBRL(plan.price_monthly_cents)}/mês · ${formatBRL(
                        plan.price_yearly_cents ?? 0
                      )}/ano`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={plan.id === "pro" ? "default" : "outline"}
                className="w-full"
                disabled
                title="Checkout disponível na FASE 7"
              >
                {plan.id === "free" ? "Plano atual" : "Assinar (em breve)"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transações</CardTitle>
          <CardDescription>
            Histórico de pagamentos da organização. O checkout seguro (Stripe), notas e portal do
            cliente são ativados na FASE 7 — Enterprise &amp; Billing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(payments ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma transação registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-line">
              {(payments ?? []).map((p, i) => (
                <li key={i} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-ink">{p.description ?? "Pagamento"}</span>
                  <span className="flex items-center gap-3">
                    <Badge variant={p.status === "SUCCEEDED" ? "default" : "neutral"}>
                      {p.status}
                    </Badge>
                    <span className="font-mono text-ink">{formatBRL(p.amount_cents)}</span>
                    <span className="text-ink-dim">{formatDate(p.paid_at ?? p.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
