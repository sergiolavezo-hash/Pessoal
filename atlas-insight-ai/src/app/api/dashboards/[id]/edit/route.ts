import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";
import { AIOrchestrator } from "@/ai/orchestrator";
import { getDashboard, parseSpec, updateDashboardSpec } from "@/services/dashboards";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  instruction: z.string().min(3).max(2000),
});

/** "Ask Atlas to change this dashboard" — AI edits the spec, never the DOM. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const dashboard = await getDashboard(ctx, id);
    const currentSpec = parseSpec(dashboard.spec);

    const orchestrator = new AIOrchestrator(ctx);
    const newSpec = await orchestrator.editDashboard(currentSpec, body.instruction);
    const updated = await updateDashboardSpec(ctx, id, newSpec, `AI edit: ${body.instruction.slice(0, 200)}`);

    await auditLog(ctx, "changed_dashboard", "dashboard", id, { instruction: body.instruction });
    return NextResponse.json({ dashboard: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
