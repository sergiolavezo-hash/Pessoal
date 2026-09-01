import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertStoreAdmin } from "@/store/admin";
import { productCreateSchema } from "@/store/schemas";

/**
 * Catálogo pela ótica de quem vende.
 *
 * Usa o cliente de serviço porque a RLS da vitrine só enxerga produto
 * `active` — a administração precisa ver rascunho e arquivado, que é
 * justamente o que o cliente não pode ver. A autorização acontece ANTES, em
 * assertStoreAdmin.
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    assertStoreAdmin(ctx);

    const { data, error } = await createAdminClient()
      .from("store_products")
      .select("*, store_product_styles(id, style, name, published, revision, asset_path, price_cents)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ products: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ctx = await requireWorkspace(body?.workspaceId ?? null);
    assertStoreAdmin(ctx);

    const input = productCreateSchema.parse(body);
    const { data, error } = await createAdminClient()
      .from("store_products")
      .insert({
        slug: input.slug,
        name: input.name,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        category: input.category ?? null,
        price_cents: input.priceCents,
        compatibility: input.compatibility ?? null,
        license: input.license ?? null,
        seo_title: input.seoTitle ?? null,
        seo_description: input.seoDescription ?? null,
        cover_url: input.coverUrl ?? null,
        // Nasce rascunho SEMPRE. Publicar é um ato deliberado, e um produto
        // que aparece na vitrine sem preview nem arquivo queima a loja.
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new ApiError(409, `Já existe um produto com o slug "${input.slug}".`);
      throw new ApiError(500, error.message);
    }
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
