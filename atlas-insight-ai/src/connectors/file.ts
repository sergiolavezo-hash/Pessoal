import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ConnectorError,
  DEFAULT_MAX_ROWS,
  DEFAULT_TIMEOUT_MS,
  SAMPLE_LIMIT,
  type ColumnInfo,
  type ConnectionResult,
  type DataConnector,
  type DataMetadata,
  type QueryOptions,
  type QueryResult,
  type SchemaInfo,
  type TableInfo,
} from "@/connectors/types";

/**
 * Connector for uploaded CSV/XLSX files. Each uploaded file is materialized
 * as a real Postgres table in the `file_data` schema (see migration 0006),
 * so SQL execution here is genuine SQL — run under a SELECT-only role.
 *
 * Physical table names are `f_<uuid-hex>`; the catalog maps logical file
 * names to physical tables per workspace.
 */
export class FileConnector implements DataConnector {
  readonly dialect = "postgres" as const;

  constructor(
    private readonly admin: SupabaseClient,
    private readonly workspaceId: string,
    private readonly dataSourceId: string
  ) {}

  async testConnection(): Promise<ConnectionResult> {
    const start = Date.now();
    const { error } = await this.admin
      .from("datasets")
      .select("id", { head: true, count: "exact" })
      .eq("data_source_id", this.dataSourceId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "File storage reachable", latencyMs: Date.now() - start };
  }

  async getMetadata(): Promise<DataMetadata> {
    return { dialect: this.dialect, schemas: [{ name: "file_data" }], defaultSchema: "file_data" };
  }

  async listSchemas(): Promise<SchemaInfo[]> {
    return [{ name: "file_data" }];
  }

  async listTables(): Promise<TableInfo[]> {
    const { data, error } = await this.admin
      .from("catalog_tables")
      .select("name, row_count, datasets!inner(data_source_id)")
      .eq("workspace_id", this.workspaceId)
      .eq("datasets.data_source_id", this.dataSourceId);
    if (error) throw new ConnectorError(error.message, "QUERY_FAILED");
    return (data ?? []).map((t) => ({
      schema: "file_data",
      name: t.name,
      rowCount: t.row_count,
    }));
  }

  /** `table` here is the physical name (f_<hex>). */
  async getColumns(table: string): Promise<ColumnInfo[]> {
    const { data, error } = await this.admin.rpc("get_file_table_columns", { p_table_name: table });
    if (error) throw new ConnectorError(error.message, "QUERY_FAILED");
    return (data as Array<{ name: string; type: string; nullable: boolean; ordinal: number }>).map((c) => ({
      name: c.name,
      dataType: c.type,
      nullable: c.nullable,
      ordinal: c.ordinal,
    }));
  }

  async getSampleData(table: string, limit = SAMPLE_LIMIT): Promise<Record<string, unknown>[]> {
    const result = await this.executeQuery(
      `SELECT * FROM ${this.quoteIdentifier(table)} LIMIT ${Math.min(limit, 1000)}`
    );
    return result.rows;
  }

  async executeQuery(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    const start = Date.now();
    const { data, error } = await this.admin.rpc("run_file_query", {
      p_query: query,
      p_max_rows: options.maxRows ?? DEFAULT_MAX_ROWS,
      p_timeout_ms: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    if (error) {
      if (error.message.includes("statement timeout")) {
        throw new ConnectorError("Query timed out", "TIMEOUT");
      }
      throw new ConnectorError(error.message, "QUERY_FAILED");
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    return {
      columns: Object.keys(rows[0] ?? {}).map((name) => ({ name })),
      rows,
      rowCount: rows.length,
      durationMs: Date.now() - start,
      truncated: false,
    };
  }

  quoteIdentifier(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
  }

  async close(): Promise<void> {}
}
