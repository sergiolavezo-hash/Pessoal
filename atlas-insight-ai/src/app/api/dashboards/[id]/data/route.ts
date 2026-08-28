import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { getDashboard, parseSpec } from "@/services/dashboards";
import { executeQueryBatch } from "@/services/query-engine";
import { canRunDashboard, TRIAL_BLOCK_MESSAGES } from "@/services/billing";

export const maxDuration = 60;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  /** Restrict to specific widgets (e.g. after an edit); default: all. */
  widgetIds: z.array(z.string()).optional(),
  /** true = NDJSON, um widget por linha, conforme ficam prontos. */
  stream: z.boolean().optional(),
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
 *
 * As consultas rodam em paralelo sobre UMA conexão e, em modo stream, cada
 * widget é enviado assim que termina: o painel pinta progressivamente em vez
 * de esperar o último gráfico.
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
    const dataSourceId = spec.dataSourceId;

    const widgets = spec.widgets.filter((w) => !body.widgetIds || body.widgetIds.includes(w.id));
    const items = widgets.map((w) => ({
      key: w.id,
      sql: w.query.sql,
      context: { dashboardId: id, widgetId: w.id, title: w.title },
    }));

    const toWidgetData = (r: {
      key: string;
      executionId: string;
      result?: { columns: Array<{ name: string }>; rows: Record<string, unknown>[]; rowCount: number };
      error?: string;
    }): WidgetData => ({
      widgetId: r.key,
      columns: r.result?.columns ?? [],
      rows: r.result?.rows ?? [],
      rowCount: r.result?.rowCount ?? 0,
      executionId: r.executionId,
      error: r.error,
    });

    if (!body.stream) {
      const results = await executeQueryBatch(ctx, dataSourceId, items, { maxRows: 2000 });
      return NextResponse.json({ data: results.map(toWidgetData) });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          await executeQueryBatch(ctx, dataSourceId, items, {
            maxRows: 2000,
            onResult: (r) => {
              controller.enqueue(encoder.encode(`${JSON.stringify(toWidgetData(r))}\n`));
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Query failed";
          controller.enqueue(encoder.encode(`${JSON.stringify({ error: message })}\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        // Sem isto, proxies podem segurar o corpo e anular o streaming.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
