import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";
import { refreshDataset } from "@/services/dataset-refresh";

export const maxDuration = 60;

const bodySchema = z.object({ workspaceId: z.string().uuid() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const result = await refreshDataset(ctx, id);

    await auditLog(ctx, "refreshed_dataset", "data_source", id, {
      changed: result.changed,
      published: result.published,
      score: result.score,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
