import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";
import { AIOrchestrator } from "@/ai/orchestrator";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  prompt: z.string().min(3).max(4000),
  dataSourceId: z.string().uuid().optional(),
});

/**
 * One-shot analysis: interpret intent, generate + validate + execute SQL,
 * return the result with full evidence.
 */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");
    const orchestrator = new AIOrchestrator(ctx);
    const { sqlAnswer, execution } = await orchestrator.answerWithData(body.prompt, body.dataSourceId);

    await auditLog(ctx, "ai_analysis", "query_execution", execution.executionId);
    return NextResponse.json({
      intent: sqlAnswer.intent,
      explanation: sqlAnswer.explanation,
      metrics: sqlAnswer.metrics_used,
      period: sqlAnswer.period ?? null,
      assumptions: sqlAnswer.assumptions,
      sql: execution.sql,
      executionId: execution.executionId,
      columns: execution.result.columns,
      rows: execution.result.rows,
      rowCount: execution.result.rowCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
