import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { getDashboard, parseSpec } from "@/services/dashboards";
import { executeQuery } from "@/services/query-engine";
import { canRunDashboard, TRIAL_BLOCK_MESSAGES } from "@/services/billing";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  /** Restrict to specific widgets (e.g. after an edit); default: all. */
  widgetIds: z.array(z.string()).optional(),
});

export interface WidgetData {
  widgetId: string;
  columns: Array<{ name: string }>;
  rows: Record<string, unknown>[];
  rowCount: number;
  executionId?: string;
  error?: string;
}

/**
 * Executes the stored (already validated) widget queries of a dashboard.
 * VIEWER role is enough — the queries were authored by editors and are
 * re-validated read-only before every execution.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId);

    // Viewing stays available while the trial clock runs, even after the
    // included dashboard run is spent; a closed trial blocks data access.
    const verdict = await canRunDashboard(ctx.supabase, ctx.organizationId);
    if (!(verdict.view_allowed ?? verdict.allowed)) {
      throw new ApiError(
        402,
        TRIAL_BLOCK_MESSAGES[verdict.reason] ?? `Access not allowed (${verdict.reason}).`
      );
    }

    const dashboard = await getDashboard(ctx, id);
    const spec = parseSpec(dashboard.spec);
    if (!spec.dataSourceId) throw new ApiError(422, "Dashboard has no data source bound");

    const widgets = spec.widgets.filter((w) => !body.widgetIds || body.widgetIds.includes(w.id));

    const data: WidgetData[] = [];
    for (const widget of widgets) {
      try {
        const execution = await executeQuery(ctx, spec.dataSourceId, widget.query.sql, {
          context: { dashboardId: id, widgetId: widget.id, title: widget.title },
          maxRows: 2000,
        });
        data.push({
          widgetId: widget.id,
          columns: execution.result.columns,
          rows: execution.result.rows,
          rowCount: execution.result.rowCount,
          executionId: execution.executionId,
        });
      } catch (error) {
        data.push({
          widgetId: widget.id,
          columns: [],
          rows: [],
          rowCount: 0,
          error: error instanceof Error ? error.message : "Query failed",
        });
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
