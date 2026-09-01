import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertStoreAdmin } from "@/store/admin";
import { productUpdateSchema } from "@/store/schemas";

type Params = { params: Promise<{ id: string }> };

const FIELD: Record<string, string> = {
  name: "name", subtitle: "subtitle", description: "description", category: "category",
  priceCents: "price_cents", compatibility: "compatibility", license: "license",
  seoTitle: "seo_title", seoDescription: "seo_description", coverUrl: "cover_url",
  status: "status", sortOrder: "sort_order",
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const ctx = await requireWorkspace(body?.workspaceId ?? null);
    assertStoreAdmin(ctx);

    const input = productUpdateSchema.parse(body);
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, column] of Object.entries(FIELD)) {
      if (key in input) updates[column] = (input as Record<string, unknown>)[key];
    }

    const admin = createAdminClient();

    // Publicar exige ter o que publicar. Um produto na vitrine sem estilo
    // publicado é uma página que promete e não entrega — e o cliente que
    // clicou não volta.
    if (input.status === "active") {
      const { count } = await admin
        .from("store_product_styles")
        .select("id", { count: "exact", head: true })
        .eq("product_id", id)
        .eq("published", true);
      if (!count) {
        throw new ApiError(
          409,
          "Publique ao menos um estilo antes de colocar o produto na vitrine — com nenhum, a página abre vazia."
        );
      }
    }

    const { data, error } = await admin
      .from("store_products").update(updates).eq("id", id).select().single();
    if (error || !data) throw new ApiError(404, error?.message ?? "Produto não encontrado.");
    return NextResponse.json({ product: data });
  } catch (error) {
    return handleApiError(error);
  }
}
