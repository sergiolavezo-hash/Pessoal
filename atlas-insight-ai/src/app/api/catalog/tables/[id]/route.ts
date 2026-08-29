import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { invalidateAiCache } from "@/services/file-dedup";

const ROLES = [
  "MEASURE",
  "DATE",
  "CATEGORY",
  "DIMENSION",
  "BOOLEAN",
  "TEXT",
  "ID",
  "FOREIGN_KEY",
] as const;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  displayName: z.string().max(120).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  columns: z
    .array(
      z.object({
        name: z.string().min(1),
        displayName: z.string().max(120).nullable().optional(),
        description: z.string().max(500).nullable().optional(),
        // null limpa a correção e devolve a coluna ao palpite do perfilador.
        role: z.enum(ROLES).nullable().optional(),
        excluded: z.boolean().optional(),
      })
    )
    .max(500)
    .optional(),
});

function clean(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Corrige o que o Atlas entendeu de uma tabela.
 *
 * O rótulo da tabela e o papel de cada coluna vão para o prompt da IA: uma
 * coluna classificada como categoria quando é valor faz o painel contar
 * registros em vez de somar dinheiro. Por isso a correção invalida o cache —
 * respostas guardadas foram geradas com o entendimento antigo.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const { data: table } = await ctx.supabase
      .from("catalog_tables")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();
    if (!table) throw new ApiError(404, "Tabela não encontrada.");

    const tablePatch: Record<string, unknown> = {};
    if (body.displayName !== undefined) tablePatch.display_name = clean(body.displayName);
    if (body.description !== undefined) tablePatch.description = clean(body.description);

    if (Object.keys(tablePatch).length > 0) {
      const { error } = await ctx.supabase
        .from("catalog_tables")
        .update(tablePatch)
        .eq("id", id)
        .eq("workspace_id", ctx.workspaceId);
      if (error) throw new ApiError(500, error.message);
    }

    for (const column of body.columns ?? []) {
      const patch: Record<string, unknown> = {};
      if (column.displayName !== undefined) patch.display_name = clean(column.displayName);
      if (column.description !== undefined) patch.description = clean(column.description);
      if (column.role !== undefined) patch.role_override = column.role;
      if (column.excluded !== undefined) patch.excluded = column.excluded;
      if (Object.keys(patch).length === 0) continue;

      const { error } = await ctx.supabase
        .from("catalog_columns")
        .update(patch)
        .eq("table_id", id)
        .eq("name", column.name)
        .eq("workspace_id", ctx.workspaceId);
      if (error) throw new ApiError(500, error.message);
    }

    // O entendimento mudou: as respostas guardadas foram geradas com o
    // anterior e passariam a estar erradas.
    await invalidateAiCache(ctx.workspaceId);

    await auditLog(ctx, "updated_semantics", "catalog_table", id, {
      columns: body.columns?.length ?? 0,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
