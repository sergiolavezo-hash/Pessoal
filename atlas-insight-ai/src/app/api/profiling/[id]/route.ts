import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";
import { profileDataSource } from "@/services/profiling";

const bodySchema = z.object({ workspaceId: z.string().uuid() });

/** POST /api/profiling/:dataSourceId — profile all tables of a data source. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");
    const summary = await profileDataSource(ctx, id);
    await auditLog(ctx, "profiled_data_source", "data_source", id, summary);
    return NextResponse.json({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
