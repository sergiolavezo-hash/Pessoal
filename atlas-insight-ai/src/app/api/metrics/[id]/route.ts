import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { validateMetricForWorkspace } from "@/services/metrics";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(2000).nullable().optional(),
  formula: z.string().min(1).max(2000).optional(),
  format: z.enum(["number", "currency", "percent", "decimal"]).optional(),
  status: z.enum(["DRAFT", "VALIDATED", "ACTIVE", "DEPRECATED"]).optional(),
  certified: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    // Certification is a governance action — ADMIN+.
    const minRole = body.certified !== undefined ? "ADMIN" : "EDITOR";
    const ctx = await requireWorkspace(body.workspaceId, minRole);

    const { data: existing } = await ctx.supabase
      .from("metrics")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .single();
    if (!existing) throw new ApiError(404, "Metric not found");

    const updates: Record<string, unknown> = {};
    let validation = null;
    if (body.formula && body.formula !== existing.formula) {
      validation = await validateMetricForWorkspace(ctx, body.formula, existing.slug);
      updates.formula = body.formula;
      updates.status = validation.valid ? "VALIDATED" : "DRAFT";
      updates.version = existing.version + 1;
    }
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.format) updates.format = body.format;
    if (body.status) updates.status = body.status;
    if (body.certified !== undefined) updates.certified = body.certified;

    const { data: metric, error } = await ctx.supabase
      .from("metrics")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new ApiError(500, error.message);

    await auditLog(ctx, body.certified !== undefined ? "certified_metric" : "updated_metric", "metric", id);
    return NextResponse.json({ metric, validation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId, "EDITOR");
    const { error } = await ctx.supabase
      .from("metrics")
      .update({ deleted_at: new Date().toISOString(), status: "DEPRECATED" })
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId);
    if (error) throw new ApiError(500, error.message);
    await auditLog(ctx, "deleted_metric", "metric", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
