import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, ApiError, auditLog } from "@/services/api-context";
import { getStripe } from "@/services/stripe";
import {
  CREDIT_PACKS,
  findCreditPack,
  getCreditStatus,
} from "@/services/ai-credits";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  packId: z.string().min(1),
});

/** Saldo, franquia do dia e pacotes disponíveis para recarga. */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const status = await getCreditStatus(ctx.supabase, ctx.organizationId);
    return NextResponse.json({ status, packs: CREDIT_PACKS });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Inicia a recarga. O crédito só entra na carteira quando o Stripe confirmar
 * o pagamento (webhook) — nunca aqui, para não creditar compra não paga.
 */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "ADMIN");

    const pack = findCreditPack(body.packId);
    if (!pack) throw new ApiError(400, "Pacote de recarga inválido");

    const stripe = getStripe();
    const origin = request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: ctx.organizationId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: pack.priceCents,
            product_data: {
              name: `Atlas Insight AI — ${pack.name}`,
              description: `Créditos de IA para continuar analisando seus dados`,
            },
          },
        },
      ],
      // O webhook lê estes campos para creditar a carteira certa.
      metadata: {
        kind: "ai_credits",
        organization_id: ctx.organizationId,
        pack_id: pack.id,
        credit_cents: String(pack.creditCents),
      },
      success_url: `${origin}/settings/billing?credits=ok`,
      cancel_url: `${origin}/settings/billing?credits=cancel`,
    });

    await auditLog(ctx, "started_credit_purchase", "billing", pack.id, {
      price_cents: pack.priceCents,
      credit_cents: pack.creditCents,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error);
  }
}
