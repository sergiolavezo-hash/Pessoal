import "server-only";
import { serverEnv } from "@/lib/env";
import { validateReadOnlySql, validateTableAllowlist } from "@/ai/query-engine/sql-validator";
import { getConnectorFor } from "@/services/data-sources";
import type { QueryResult } from "@/connectors/types";
import type { ApiContext } from "@/services/api-context";
import { ApiError } from "@/services/api-context";

export interface ExecuteOptions {
  /** Context stored with the execution (metric, period, filters...). */
  context?: Record<string, unknown>;
  /** Restrict referenced tables to this allowlist (semantic context tables). */
  allowedTables?: string[];
  maxRows?: number;
}

export interface ExecutionRecord {
  executionId: string;
  result: QueryResult;
  sql: string;
}

/**
 * The single gate for query execution: validates read-only SQL, enforces the
 * table allowlist, executes with timeout + row cap, and records the
 * execution as evidence. Every number shown in the product traces back to a
 * query_executions row created here.
 */
export async function executeQuery(
  ctx: ApiContext,
  dataSourceId: string,
  sql: string,
  options: ExecuteOptions = {}
): Promise<ExecutionRecord> {
  const env = serverEnv();
  const { dataSource, connector } = await getConnectorFor(ctx, dataSourceId);

  const validation = validateReadOnlySql(sql, connector.dialect);

  const record = async (
    status: string,
    fields: Record<string, unknown> = {}
  ): Promise<string> => {
    const { data } = await ctx.supabase
      .from("query_executions")
      .insert({
        workspace_id: ctx.workspaceId,
        data_source_id: dataSource.id,
        user_id: ctx.user.id,
        sql,
        dialect: connector.dialect,
        status,
        context: options.context ?? {},
        ...fields,
      })
      .select("id")
      .single();
    return data?.id ?? "";
  };

  if (!validation.valid) {
    const executionId = await record("BLOCKED", { error: validation.errors.join("; ") });
    await connector.close();
    throw new ApiError(400, `Query blocked: ${validation.errors.join("; ")} [execution ${executionId}]`);
  }

  if (options.allowedTables && options.allowedTables.length > 0 && validation.tables.length > 0) {
    const unknown = validateTableAllowlist(validation.tables, options.allowedTables);
    if (unknown.length > 0) {
      const executionId = await record("BLOCKED", {
        error: `Query references tables outside the workspace catalog: ${unknown.join(", ")}`,
      });
      await connector.close();
      throw new ApiError(400, `Query references unknown tables: ${unknown.join(", ")} [execution ${executionId}]`);
    }
  }

  const started = Date.now();
  try {
    const result = await connector.executeQuery(sql, {
      maxRows: Math.min(options.maxRows ?? env.QUERY_MAX_ROWS, env.QUERY_MAX_ROWS),
      timeoutMs: env.QUERY_TIMEOUT_MS,
    });
    const executionId = await record("SUCCEEDED", {
      row_count: result.rowCount,
      duration_ms: result.durationMs,
    });
    return { executionId, result, sql };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    const isTimeout = message.toLowerCase().includes("timed out");
    await record(isTimeout ? "TIMEOUT" : "FAILED", {
      error: message,
      duration_ms: Date.now() - started,
    });
    throw new ApiError(422, message);
  } finally {
    await connector.close();
  }
}
