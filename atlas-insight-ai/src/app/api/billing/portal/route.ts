import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/services/api-context";
import { getStripe } from "@/services/stripe";
import type { OrgRole } from "@/types";

const bodySchema = z.object({ organizationId: z.string().uuid() });

/** Portal do cliente Stripe: trocar cartão, baixar notas, cancelar. */
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

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("external_customer_id")
      .eq("organization_id", body.organizationId)
      .maybeSingle();
    if (!sub?.external_customer_id) {
      throw new ApiError(422, "No active payment profile for this organization yet.");
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.external_customer_id,
      return_url: `${request.nextUrl.origin}/settings/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error);
  }
}
