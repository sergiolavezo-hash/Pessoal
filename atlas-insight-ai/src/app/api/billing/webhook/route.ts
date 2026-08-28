import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, PLAN_TIER } from "@/services/stripe";
import { addCredits } from "@/services/ai-credits";

/**
 * Webhook do Stripe — única porta de escrita do billing. Toda transação é
 * VALIDADA pela assinatura criptográfica do webhook antes de tocar o banco.
 * LGPD: nunca recebemos nem armazenamos dados de cartão; apenas ids,
 * valores e URLs de fatura emitidos pelo Stripe.
 */
export async function POST(request: NextRequest) {
  const env = serverEnv();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return NextResponse.json(
      { error: `invalid signature: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organization_id ?? session.client_reference_id;

        // Recarga de créditos de IA: não mexe na assinatura, só na carteira.
        // Idempotente pela referência (o Stripe reenvia webhooks).
        if (session.metadata?.kind === "ai_credits") {
          const creditCents = Number(session.metadata.credit_cents);
          if (orgId && Number.isFinite(creditCents) && creditCents > 0) {
            await addCredits(orgId, creditCents, {
              kind: "purchase",
              reference: session.id,
              note: `Recarga ${session.metadata.pack_id ?? ""}`.trim(),
            });
          }
          break;
        }

        const planId = session.metadata?.plan_id ?? "pro";
        const interval = session.metadata?.interval === "yearly" ? "yearly" : "monthly";
        if (!orgId) break;
        await db
          .from("subscriptions")
          .update({
            plan: PLAN_TIER[planId] ?? "PRO",
            plan_id: planId,
            status: "active",
            billing_interval: interval,
            external_customer_id: typeof session.customer === "string" ? session.customer : null,
            external_subscription_id:
              typeof session.subscription === "string" ? session.subscription : null,
            cancel_at_period_end: false,
            canceled_at: null,
          })
          .eq("organization_id", orgId);
        await db
          .from("organizations")
          .update({ plan: PLAN_TIER[planId] ?? "PRO" })
          .eq("id", orgId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = await resolveOrg(db, invoice);
        if (!orgId) break;
        const periodEnd = invoice.lines.data[0]?.period?.end;
        await db
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString()
              : null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          })
          .eq("organization_id", orgId);
        await db.from("payment_transactions").upsert(
          {
            organization_id: orgId,
            amount_cents: invoice.amount_paid,
            currency: (invoice.currency ?? "brl").toUpperCase(),
            status: "succeeded",
            description: invoice.lines.data[0]?.description ?? "Assinatura Atlas Insight AI",
            external_invoice_id: invoice.id,
            invoice_url: invoice.hosted_invoice_url ?? null,
            receipt_url: invoice.invoice_pdf ?? null,
            paid_at: new Date((invoice.status_transitions?.paid_at ?? Date.now() / 1000) * 1000).toISOString(),
          },
          { onConflict: "external_invoice_id", ignoreDuplicates: true }
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = await resolveOrg(db, invoice);
        if (!orgId) break;
        await db.from("subscriptions").update({ status: "past_due" }).eq("organization_id", orgId);
        await db.from("payment_transactions").upsert(
          {
            organization_id: orgId,
            amount_cents: invoice.amount_due,
            currency: (invoice.currency ?? "brl").toUpperCase(),
            status: "failed",
            description: "Falha na cobrança — atualize a forma de pagamento",
            external_invoice_id: invoice.id,
            invoice_url: invoice.hosted_invoice_url ?? null,
          },
          { onConflict: "external_invoice_id", ignoreDuplicates: true }
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organization_id;
        const filter = orgId
          ? { column: "organization_id", value: orgId }
          : { column: "external_subscription_id", value: sub.id };
        await db
          .from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq(filter.column, filter.value);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("[billing webhook]", event.type, error);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function resolveOrg(
  db: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
): Promise<string | null> {
  const metaOrg =
    (invoice.parent?.subscription_details?.metadata?.organization_id as string | undefined) ??
    (invoice.lines.data[0]?.metadata?.organization_id as string | undefined);
  if (metaOrg) return metaOrg;
  const customer = typeof invoice.customer === "string" ? invoice.customer : null;
  if (!customer) return null;
  const { data } = await db
    .from("subscriptions")
    .select("organization_id")
    .eq("external_customer_id", customer)
    .maybeSingle();
  return data?.organization_id ?? null;
}
