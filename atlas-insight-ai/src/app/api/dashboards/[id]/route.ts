import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { dashboardSpecSchema } from "@/dashboards/spec";
import { validateReadOnlySql } from "@/ai/query-engine/sql-validator";
import { getDashboard, updateDashboardSpec } from "@/services/dashboards";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const dashboard = await getDashboard(ctx, id);
    return NextResponse.json({ dashboard });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(120).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  spec: z.unknown().optional(),
  changeSummary: z.string().max(300).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    if (body.spec !== undefined) {
      // Manual spec edits go through full validation, including every SQL.
      const spec = dashboardSpecSchema.parse(body.spec);
      for (const widget of spec.widgets) {
        const validation = validateReadOnlySql(widget.query.sql, spec.dialect);
        if (!validation.valid) {
          throw new ApiError(400, `Widget "${widget.title}": ${validation.errors.join("; ")}`);
        }
      }
      const dashboard = await updateDashboardSpec(ctx, id, spec, body.changeSummary ?? "Edited");
      await auditLog(ctx, "changed_dashboard", "dashboard", id);
      return NextResponse.json({ dashboard });
    }

    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.status) updates.status = body.status;
    const { data, error } = await ctx.supabase
      .from("dashboards")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .select()
      .single();
    if (error || !data) throw new ApiError(404, "Dashboard not found");

    await auditLog(ctx, "changed_dashboard", "dashboard", id);
    return NextResponse.json({ dashboard: data });
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
      .from("dashboards")
      .update({ deleted_at: new Date().toISOString(), status: "ARCHIVED" })
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId);
    if (error) throw new ApiError(500, error.message);
    await auditLog(ctx, "deleted_dashboard", "dashboard", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
