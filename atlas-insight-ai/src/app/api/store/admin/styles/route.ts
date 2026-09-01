import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertStoreAdmin } from "@/store/admin";
import { styleUpsertSchema } from "@/store/schemas";

/** Cria ou atualiza um estilo. O par (produto, estilo) é único. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ctx = await requireWorkspace(body?.workspaceId ?? null);
    assertStoreAdmin(ctx);

    const input = styleUpsertSchema.parse(body);
    const { data, error } = await createAdminClient()
      .from("store_product_styles")
      .upsert(
        {
          product_id: input.productId,
          style: input.style,
          name: input.name,
          description: input.description ?? null,
          pages: input.pages ?? null,
          components: input.components ?? null,
          price_cents: input.priceCents ?? null,
          preview_urls: input.previewUrls ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,style" }
      )
      .select()
      .single();
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ style: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
