import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";
import { executeQuery } from "@/services/query-engine";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  dataSourceId: z.string().uuid(),
  sql: z.string().min(1).max(20_000),
  maxRows: z.number().int().min(1).max(10_000).optional(),
});

/** Direct read-only SQL execution (technical users). */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");
    const execution = await executeQuery(ctx, body.dataSourceId, body.sql, {
      maxRows: body.maxRows,
      context: { origin: "manual" },
    });
    await auditLog(ctx, "executed_query", "query_execution", execution.executionId, {
      rows: execution.result.rowCount,
    });
    return NextResponse.json({
      executionId: execution.executionId,
      columns: execution.result.columns,
      rows: execution.result.rows,
      rowCount: execution.result.rowCount,
      durationMs: execution.result.durationMs,
      truncated: execution.result.truncated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
