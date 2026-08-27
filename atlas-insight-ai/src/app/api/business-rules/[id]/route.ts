import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(120).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.status) updates.status = body.status;

    const { data, error } = await ctx.supabase
      .from("business_rules")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .select()
      .single();
    if (error || !data) throw new ApiError(404, "Business rule not found");

    await auditLog(ctx, "changed_business_rule", "business_rule", id);
    return NextResponse.json({ businessRule: data });
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
      .from("business_rules")
      .delete()
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId);
    if (error) throw new ApiError(500, error.message);
    await auditLog(ctx, "deleted_business_rule", "business_rule", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
