import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";

const postSchema = z.object({
  workspaceId: z.string().uuid(),
  sourceColumnId: z.string().uuid(),
  targetColumnId: z.string().uuid(),
  relationshipType: z
    .enum(["one-to-one", "one-to-many", "many-to-one", "many-to-many"])
    .default("many-to-one"),
});

/** Cria um relacionamento declarado pelo usuário entre duas colunas. */
export async function POST(request: NextRequest) {
  try {
    const body = postSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    if (body.sourceColumnId === body.targetColumnId) {
      throw new ApiError(422, "Choose two different columns.");
    }

    const { data: cols } = await ctx.supabase
      .from("catalog_columns")
      .select("id, name, table_id")
      .in("id", [body.sourceColumnId, body.targetColumnId])
      .eq("workspace_id", ctx.workspaceId);
    if ((cols ?? []).length !== 2) throw new ApiError(404, "Column not found");
    const [a, b] = cols!;
    if (a.table_id === b.table_id) {
      throw new ApiError(422, "Relationships connect columns of different tables.");
    }

    const { data, error } = await ctx.supabase
      .from("catalog_relationships")
      .upsert(
        {
          workspace_id: ctx.workspaceId,
          source_column_id: body.sourceColumnId,
          target_column_id: body.targetColumnId,
          relationship_type: body.relationshipType,
          confidence: 1,
          reason: "Declared by user",
          source: "declared",
        },
        { onConflict: "source_column_id,target_column_id" }
      )
      .select()
      .single();
    if (error) throw new ApiError(500, error.message);

    await auditLog(ctx, "declared_relationship", "relationship", data.id);
    return NextResponse.json({ relationship: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
