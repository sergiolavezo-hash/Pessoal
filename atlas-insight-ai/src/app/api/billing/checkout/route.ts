import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/services/api-context";
import { getStripe } from "@/services/stripe";
import type { BillingPlan, OrgRole } from "@/types";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  planId: z.enum(["pro", "business"]),
  interval: z.enum(["monthly", "yearly"]),
});

/**
 * Cria uma sessão de checkout do Stripe para assinatura mensal/anual.
 * LGPD/PCI: nenhum dado de cartão passa pela Atlas — a coleta acontece na
 * página segura do Stripe; armazenamos apenas ids e valores da transação.
 */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Not authenticated");

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", body.organizationId)
      .eq("user_id", user.id)
      .single();
    const role = membership?.role as OrgRole | undefined;
    if (!role || !["OWNER", "ADMIN"].includes(role)) {
      throw new ApiError(403, "Only OWNER/ADMIN can manage billing.");
    }

    const { data: planRow } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("id", body.planId)
      .single();
    const plan = planRow as BillingPlan | null;
    const unitAmount =
      body.interval === "monthly" ? plan?.price_monthly_cents : plan?.price_yearly_cents;
    if (!plan || unitAmount == null) {
      throw new ApiError(422, "This plan requires contacting sales.");
    }

    const stripe = getStripe();
    const origin = request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      client_reference_id: body.organizationId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency.toLowerCase(),
            unit_amount: unitAmount,
            recurring: { interval: body.interval === "monthly" ? "month" : "year" },
            product_data: {
              name: `Atlas Insight AI — ${plan.name} (${body.interval === "monthly" ? "mensal" : "anual"})`,
            },
          },
        },
      ],
      metadata: {
        organization_id: body.organizationId,
        plan_id: body.planId,
        interval: body.interval,
      },
      subscription_data: {
        metadata: { organization_id: body.organizationId, plan_id: body.planId },
      },
      success_url: `${origin}/settings/billing?status=success&plan=${body.planId}&interval=${body.interval}&amount=${unitAmount}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/billing?status=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error);
  }
}
