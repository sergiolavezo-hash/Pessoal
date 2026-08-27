import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";
import { syncDataSource } from "@/services/data-sources";

const bodySchema = z.object({ workspaceId: z.string().uuid() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");
    const summary = await syncDataSource(ctx, id);
    await auditLog(ctx, "synced_data_source", "data_source", id, summary);
    return NextResponse.json({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
