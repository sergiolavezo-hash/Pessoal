import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertStoreAdmin } from "@/store/admin";
import { stylePublishSchema } from "@/store/schemas";

type Params = { params: Promise<{ id: string }> };

/**
 * Publica ou despublica um estilo.
 *
 * Publicar exige arquivo E preview. É a última porta antes da vitrine, e um
 * produto que aparece sem uma das duas coisas custa a venda e a confiança —
 * o cliente clica em "Adquirir" e descobre depois que não há o que baixar.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const ctx = await requireWorkspace(body?.workspaceId ?? null);
    assertStoreAdmin(ctx);
    const { published } = stylePublishSchema.parse(body);

    const admin = createAdminClient();

    if (published) {
      const { data: style } = await admin
        .from("store_product_styles")
        .select("asset_path, preview_urls")
        .eq("id", id)
        .maybeSingle();
      if (!style) throw new ApiError(404, "Estilo não encontrado.");

      const faltando: string[] = [];
      if (!style.asset_path) faltando.push("o arquivo .pbix");
      if (!(style.preview_urls as string[] | null)?.length) faltando.push("ao menos um preview");
      if (faltando.length > 0) {
        throw new ApiError(
          409,
          `Falta ${faltando.join(" e ")} para publicar. Sem isso o cliente compra sem ver o que está levando.`
        );
      }
    }

    const { data, error } = await admin
      .from("store_product_styles")
      .update({ published, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new ApiError(404, error?.message ?? "Estilo não encontrado.");
    return NextResponse.json({ style: data });
  } catch (error) {
    return handleApiError(error);
  }
}
