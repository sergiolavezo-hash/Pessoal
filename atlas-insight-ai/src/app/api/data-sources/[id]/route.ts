import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { getDataSource } from "@/services/data-sources";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const dataSource = await getDataSource(ctx, id);
    return NextResponse.json({ dataSource });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");
    await getDataSource(ctx, id);

    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.config) updates.config = body.config;

    const { data, error } = await ctx.supabase
      .from("data_sources")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new ApiError(500, error.message);

    await auditLog(ctx, "updated_data_source", "data_source", id);
    return NextResponse.json({ dataSource: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId, "EDITOR");
    await getDataSource(ctx, id);

    const { error } = await ctx.supabase
      .from("data_sources")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new ApiError(500, error.message);

    await auditLog(ctx, "deleted_data_source", "data_source", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
