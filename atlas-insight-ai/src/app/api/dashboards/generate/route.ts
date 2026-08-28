import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";
import { AIOrchestrator } from "@/ai/orchestrator";
import { createDashboard } from "@/services/dashboards";
import { assertAllowed, canRunDashboard, consumeDashboardRun } from "@/services/billing";

export const maxDuration = 60;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  prompt: z.string().min(5).max(4000),
  // Obrigatório: o painel é estruturado a partir de UMA fonte selecionada.
  dataSourceId: z.string().uuid(),
  // Contexto de análise (assunto, estilo Looker) dentro da fonte; ausente = todos.
  context: z.string().max(80).optional(),
});

/** Natural language -> validated DashboardSpecification -> stored dashboard. */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    // Trial gate: 14 days OR 1 dashboard run, whichever ends first.
    assertAllowed(await canRunDashboard(ctx.supabase, ctx.organizationId));

    const orchestrator = new AIOrchestrator(ctx);
    const spec = await orchestrator.generateDashboard(body.prompt, body.dataSourceId, body.context);
    const dashboard = await createDashboard(ctx, spec, { generatedByAi: true });

    await consumeDashboardRun(ctx.supabase, ctx.workspaceId, dashboard.id);

    await auditLog(ctx, "generated_dashboard", "dashboard", dashboard.id, { prompt: body.prompt });
    await ctx.supabase.from("usage_events").insert({
      organization_id: ctx.organizationId,
      workspace_id: ctx.workspaceId,
      user_id: ctx.user.id,
      event_type: "dashboard_created",
    });

    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
