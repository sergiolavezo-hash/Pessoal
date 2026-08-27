import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId, "EDITOR");

    const { error, count } = await ctx.supabase
      .from("catalog_relationships")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId);
    if (error) throw new ApiError(500, error.message);
    if (!count) throw new ApiError(404, "Relationship not found");

    await auditLog(ctx, "deleted_relationship", "relationship", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
