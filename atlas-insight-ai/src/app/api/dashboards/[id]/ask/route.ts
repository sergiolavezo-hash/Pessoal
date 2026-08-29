import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { getDashboard } from "@/services/dashboards";
import { dashboardSpecSchema } from "@/dashboards/spec";
import { executeQuery } from "@/services/query-engine";
import { AIOrchestrator } from "@/ai/orchestrator";
import { resolveFromMemory } from "@/ai/memory-resolver";

export const maxDuration = 60;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  question: z.string().min(2).max(2000),
});

/**
 * Perguntar dentro do painel.
 *
 * A ordem é o ponto todo: primeiro a memória, depois a IA.
 *
 * Quando o painel foi gerado, cada widget ficou com o que ele calcula — o
 * título, a explicação e o SQL já validado contra esta fonte. Isso foi
 * entendido uma vez, com token gasto uma vez. Se a pergunta corresponde a um
 * widget que já existe, executamos aquele SQL: a resposta é exata, sai em
 * milissegundos e não consome nada da cota de IA.
 *
 * A IA entra só quando a pergunta é genuinamente nova — porque transformar
 * linguagem nova em SQL exige interpretação, e nenhuma memória substitui isso.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "VIEWER");

    const dashboard = await getDashboard(ctx, id);
    const spec = dashboardSpecSchema.safeParse(dashboard.spec);
    if (!spec.success) throw new ApiError(422, "Este painel tem uma especificação inválida.");

    const match = resolveFromMemory(
      body.question,
      spec.data.widgets.map((widget) => ({
        id: widget.id,
        title: widget.title,
        explanation: widget.query.explanation,
        metrics: widget.query.metrics,
      }))
    );

    if (match && spec.data.dataSourceId) {
      const widget = spec.data.widgets.find((w) => w.id === match.id);
      if (widget) {
        const execution = await executeQuery(ctx, spec.data.dataSourceId, widget.query.sql, {
          context: { purpose: "dashboard_ask", widgetId: widget.id },
        });
        return NextResponse.json({
          source: "memory",
          widgetId: widget.id,
          title: widget.title,
          explanation: widget.query.explanation ?? null,
          columns: execution.result.columns,
          rows: execution.result.rows.slice(0, 100),
          rowCount: execution.result.rowCount,
          sql: widget.query.sql,
        });
      }
    }

    // Pergunta nova: agora sim vale o token. O resultado passa a fazer parte
    // do que o painel sabe, então a repetição dela já não custará nada.
    const orchestrator = new AIOrchestrator(ctx);
    const { answer, evidence } = await orchestrator.chat(
      body.question,
      spec.data.dataSourceId ?? undefined
    );

    return NextResponse.json({ source: "ai", answer, evidence });
  } catch (error) {
    return handleApiError(error);
  }
}
