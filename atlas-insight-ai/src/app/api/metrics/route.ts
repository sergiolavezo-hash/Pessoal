import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { slugify } from "@/lib/utils";
import { validateMetricForWorkspace, listWorkspaceMetrics } from "@/services/metrics";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const metrics = await listWorkspaceMetrics(ctx);
    return NextResponse.json({ metrics });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(80),
  description: z.string().max(2000).optional(),
  formula: z.string().min(1).max(2000),
  format: z.enum(["number", "currency", "percent", "decimal"]).default("number"),
});

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const slug = slugify(body.name).replaceAll("-", "_");
    const validation = await validateMetricForWorkspace(ctx, body.formula, slug);

    const { data: metric, error } = await ctx.supabase
      .from("metrics")
      .insert({
        workspace_id: ctx.workspaceId,
        semantic_model_id: validation.semanticModelId,
        name: body.name,
        slug,
        description: body.description ?? null,
        formula: body.formula,
        format: body.format,
        status: validation.valid ? "VALIDATED" : "DRAFT",
        created_by: ctx.user.id,
      })
      .select()
      .single();
    if (error || !metric) {
      if (error?.code === "23505") throw new ApiError(409, `A metric named "${body.name}" already exists`);
      throw new ApiError(500, error?.message ?? "Failed to create metric");
    }

    await auditLog(ctx, "created_metric", "metric", metric.id, { valid: validation.valid });
    return NextResponse.json({ metric, validation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
