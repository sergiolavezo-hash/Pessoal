import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { renameModel, setModelTables } from "@/services/analysis-models";

const patchSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  tableIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    // O modelo tem de ser deste workspace: o id vem do cliente.
    const { data: model } = await ctx.supabase
      .from("analysis_models")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();
    if (!model) throw new ApiError(404, "Modelo não encontrado.");

    if (body.name !== undefined) await renameModel(ctx, id, body.name);

    if (body.description !== undefined) {
      const { error } = await ctx.supabase
        .from("analysis_models")
        .update({ description: body.description?.trim() || null })
        .eq("id", id)
        .eq("workspace_id", ctx.workspaceId);
      if (error) throw new ApiError(500, error.message);
    }

    if (body.tableIds !== undefined) {
      if (body.tableIds.length === 0) {
        throw new ApiError(400, "Um modelo precisa de ao menos uma tabela.");
      }
      await setModelTables(ctx, id, body.tableIds);
    }

    await auditLog(ctx, "updated_model", "model", id, {
      renamed: body.name !== undefined,
      tables: body.tableIds?.length,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId, "EDITOR");

    // Arquivar, não apagar: um painel pode ter sido feito sobre este modelo,
    // e remover a linha levaria junto o histórico de como ele foi montado.
    const { error } = await ctx.supabase
      .from("analysis_models")
      .update({ status: "ARCHIVED" })
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId);
    if (error) throw new ApiError(500, error.message);

    await auditLog(ctx, "archived_model", "model", id, {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
