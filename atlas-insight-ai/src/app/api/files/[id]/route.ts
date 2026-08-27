import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeColumnName } from "@/services/file-ingest";
import { fileTableName } from "@/services/data-sources";
import type { WorkspaceFile } from "@/types";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  workspaceId: z.string().uuid(),
  folder: z.string().max(80).nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const updates: Record<string, unknown> = {};
    if (body.folder !== undefined) updates.folder = body.folder;
    const { data, error } = await ctx.supabase
      .from("workspace_files")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .select()
      .single();
    if (error || !data) throw new ApiError(404, "File not found");
    return NextResponse.json({ file: data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Exclui um arquivo enviado: tabela física de dados, entrada no catálogo,
 * objeto no Storage e o registro do arquivo.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId, "EDITOR");

    const { data } = await ctx.supabase
      .from("workspace_files")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();
    const file = data as WorkspaceFile | null;
    if (!file) throw new ApiError(404, "File not found");

    const admin = createAdminClient();

    // Physical table + catalog entry (logical name mirrors the ingest).
    if (file.data_source_id) {
      const { data: dataset } = await ctx.supabase
        .from("datasets")
        .select("id")
        .eq("data_source_id", file.data_source_id)
        .eq("name", "files")
        .maybeSingle();
      if (dataset) {
        const logicalName = sanitizeColumnName(file.name.replace(/\.[^.]+$/, ""), 0, new Set());
        const { data: table } = await ctx.supabase
          .from("catalog_tables")
          .select("id")
          .eq("dataset_id", dataset.id)
          .eq("name", logicalName)
          .maybeSingle();
        if (table) {
          await admin.rpc("drop_file_table", { p_table_name: fileTableName(table.id) });
          await ctx.supabase.from("catalog_tables").delete().eq("id", table.id);
        }
      }
    }

    // Raw file in Storage (best-effort) + record.
    await admin.storage.from("workspace-files").remove([file.storage_path]);
    const { error } = await ctx.supabase.from("workspace_files").delete().eq("id", id);
    if (error) throw new ApiError(500, error.message);

    await auditLog(ctx, "deleted_file", "file", id, { name: file.name });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
