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

export interface BatchItem {
  /** Identificador do chamador (ex.: id do widget). */
  key: string;
  sql: string;
  context?: Record<string, unknown>;
}

export interface BatchResult {
  key: string;
  executionId: string;
  result?: QueryResult;
  error?: string;
}

/** Consultas simultâneas por fonte. Alto o bastante para ganhar tempo, baixo
 *  o bastante para não saturar o banco do cliente. */
const DEFAULT_CONCURRENCY = 6;

/**
 * Executa várias consultas na MESMA fonte de dados.
 *
 * Ganho sobre chamar executeQuery em série: a fonte e as credenciais são
 * resolvidas UMA vez (antes era uma leitura + descriptografia por consulta),
 * a conexão é reaproveitada, as consultas rodam em paralelo e o registro de
 * auditoria vira uma única inserção em lote no fim.
 *
 * `onResult` é chamado assim que cada consulta termina, o que permite ao
 * chamador transmitir os resultados em vez de esperar pelo último.
 */
export async function executeQueryBatch(
  ctx: ApiContext,
  dataSourceId: string,
  items: BatchItem[],
  options: ExecuteOptions & { concurrency?: number; onResult?: (r: BatchResult) => void } = {}
): Promise<BatchResult[]> {
  if (items.length === 0) return [];

  const env = serverEnv();
  const { dataSource, connector } = await getConnectorFor(ctx, dataSourceId);
  const maxRows = Math.min(options.maxRows ?? env.QUERY_MAX_ROWS, env.QUERY_MAX_ROWS);

  const results: BatchResult[] = [];
  const auditRows: Record<string, unknown>[] = [];

  const record = (
    executionId: string,
    sql: string,
    status: string,
    context: Record<string, unknown>,
    fields: Record<string, unknown> = {}
  ) => {
    auditRows.push({
      id: executionId,
      workspace_id: ctx.workspaceId,
      data_source_id: dataSource.id,
      user_id: ctx.user.id,
      sql,
      dialect: connector.dialect,
      status,
      context,
      ...fields,
    });
  };

  const emit = (r: BatchResult) => {
    results.push(r);
    options.onResult?.(r);
  };

  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      const item = items[index];
      const executionId = crypto.randomUUID();
      const context = item.context ?? options.context ?? {};

      const validation = validateReadOnlySql(item.sql, connector.dialect);
      if (!validation.valid) {
        record(executionId, item.sql, "BLOCKED", context, { error: validation.errors.join("; ") });
        emit({ key: item.key, executionId, error: `Query blocked: ${validation.errors.join("; ")}` });
        continue;
      }
      if (options.allowedTables?.length && validation.tables.length > 0) {
        const unknown = validateTableAllowlist(validation.tables, options.allowedTables);
        if (unknown.length > 0) {
          const message = `Query references unknown tables: ${unknown.join(", ")}`;
          record(executionId, item.sql, "BLOCKED", context, { error: message });
          emit({ key: item.key, executionId, error: message });
          continue;
        }
      }

      const started = Date.now();
      try {
        const result = await connector.executeQuery(item.sql, {
          maxRows,
          timeoutMs: env.QUERY_TIMEOUT_MS,
        });
        record(executionId, item.sql, "SUCCEEDED", context, {
          row_count: result.rowCount,
          duration_ms: result.durationMs,
        });
        emit({ key: item.key, executionId, result });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Query failed";
        record(executionId, item.sql, message.toLowerCase().includes("timed out") ? "TIMEOUT" : "FAILED", context, {
          error: message,
          duration_ms: Date.now() - started,
        });
        emit({ key: item.key, executionId, error: message });
      }
    }
  };

  try {
    const workers = Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, items.length);
    await Promise.all(Array.from({ length: workers }, worker));
  } finally {
    await connector.close().catch(() => undefined);
  }

  // Uma inserção em lote no lugar de uma por consulta.
  if (auditRows.length > 0) {
    await ctx.supabase.from("query_executions").insert(auditRows);
  }
  return results;
}
