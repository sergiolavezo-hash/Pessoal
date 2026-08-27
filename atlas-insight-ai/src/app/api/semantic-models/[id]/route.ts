import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";

type Params = { params: Promise<{ id: string }> };

/** Exclui um modelo semântico (as tabelas do catálogo permanecem). */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId, "EDITOR");

    const { data: model } = await ctx.supabase
      .from("semantic_models")
      .select("id, name")
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();
    if (!model) throw new ApiError(404, "Semantic model not found");

    const { error } = await ctx.supabase.from("semantic_models").delete().eq("id", id);
    if (error) throw new ApiError(500, error.message);

    await auditLog(ctx, "deleted_semantic_model", "semantic_model", id, { name: model.name });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
