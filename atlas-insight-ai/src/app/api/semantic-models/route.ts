import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { generateSemanticModel } from "@/semantic/generator";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const { data, error } = await ctx.supabase
      .from("semantic_models")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ semanticModels: data });
  } catch (error) {
    return handleApiError(error);
  }
}

const generateSchema = z.object({
  workspaceId: z.string().uuid(),
  dataSourceId: z.string().uuid(),
});

/** POST — generate (or regenerate) the semantic model for a data source. */
export async function POST(request: NextRequest) {
  try {
    const body = generateSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");
    const result = await generateSemanticModel(ctx, body.dataSourceId);
    await auditLog(ctx, "generated_semantic_model", "semantic_model", result.semanticModel.id, {
      entities: result.entityCount,
      relationships: result.relationshipCount,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
