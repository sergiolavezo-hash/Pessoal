import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { nextRefreshAt, isValidSchedule } from "@/services/refresh-schedule";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  schedule: z.enum(["manual", "hourly", "daily", "weekly"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    if (!isValidSchedule(body.schedule)) throw new ApiError(400, "Frequência inválida");

    const { error } = await ctx.supabase
      .from("data_sources")
      .update({
        refresh_schedule: body.schedule,
        next_refresh_at: nextRefreshAt(body.schedule)?.toISOString() ?? null,
      })
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId);

    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ schedule: body.schedule });
  } catch (error) {
    return handleApiError(error);
  }
}
