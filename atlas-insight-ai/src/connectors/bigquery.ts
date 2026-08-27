import "server-only";
import { BigQuery } from "@google-cloud/bigquery";
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
import type { BigQueryConfig, BigQueryCredentials } from "@/connectors/config-schemas";

export class BigQueryConnector implements DataConnector {
  readonly dialect = "bigquery" as const;
  private client: BigQuery;

  constructor(
    private readonly config: BigQueryConfig,
    credentials: BigQueryCredentials
  ) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(credentials.serviceAccountJson);
    } catch {
      throw new ConnectorError("Invalid service account JSON", "AUTH_FAILED");
    }
    this.client = new BigQuery({
      projectId: config.projectId,
      credentials: parsed as { client_email?: string; private_key?: string },
      location: config.location,
    });
  }

  async testConnection(): Promise<ConnectionResult> {
    const start = Date.now();
    try {
      await this.client.getDatasets({ maxResults: 1 });
      return { ok: true, message: "Connection successful", latencyMs: Date.now() - start };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Connection failed" };
    }
  }

  async getMetadata(): Promise<DataMetadata> {
    const schemas = await this.listSchemas();
    return { dialect: this.dialect, schemas, defaultSchema: this.config.dataset };
  }

  /** BigQuery "schemas" are datasets. */
  async listSchemas(): Promise<SchemaInfo[]> {
    try {
      const [datasets] = await this.client.getDatasets();
      return datasets
        .map((d) => ({ name: d.id ?? "" }))
        .filter((d) => d.name.length > 0);
    } catch (error) {
      throw new ConnectorError(
        error instanceof Error ? error.message : "Failed to list datasets",
        "CONNECTION_FAILED"
      );
    }
  }

  async listTables(schema?: string): Promise<TableInfo[]> {
    const datasetId = schema ?? this.config.dataset;
    if (!datasetId) throw new ConnectorError("A dataset is required", "QUERY_FAILED");
    const [tables] = await this.client.dataset(datasetId).getTables();
    const infos: TableInfo[] = [];
    for (const t of tables) {
      infos.push({
        schema: datasetId,
        name: t.id ?? "",
        rowCount: t.metadata?.numRows != null ? Number(t.metadata.numRows) : null,
      });
    }
    return infos.filter((t) => t.name.length > 0);
  }

  async getColumns(table: string, schema?: string): Promise<ColumnInfo[]> {
    const datasetId = schema ?? this.config.dataset;
    if (!datasetId) throw new ConnectorError("A dataset is required", "QUERY_FAILED");
    const [metadata] = await this.client.dataset(datasetId).table(table).getMetadata();
    const fields = (metadata.schema?.fields ?? []) as Array<{
      name: string;
      type: string;
      mode?: string;
    }>;
    return fields.map((f, i) => ({
      name: f.name,
      dataType: f.type,
      nullable: f.mode !== "REQUIRED",
      ordinal: i + 1,
    }));
  }

  async getSampleData(table: string, limit = SAMPLE_LIMIT, schema?: string): Promise<Record<string, unknown>[]> {
    const datasetId = schema ?? this.config.dataset;
    if (!datasetId) throw new ConnectorError("A dataset is required", "QUERY_FAILED");
    const result = await this.executeQuery(
      `SELECT * FROM ${this.quoteIdentifier(datasetId)}.${this.quoteIdentifier(table)} LIMIT ${Math.min(limit, 1000)}`
    );
    return result.rows;
  }

  async executeQuery(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const start = Date.now();
    try {
      const [job] = await this.client.createQueryJob({
        query,
        useLegacySql: false,
        jobTimeoutMs: timeoutMs,
        // Cost control: refuse queries that would scan more than 10 GB.
        maximumBytesBilled: String(10 * 1024 * 1024 * 1024),
      });
      const [rows] = await job.getQueryResults({ maxResults: maxRows + 1 });
      const sliced = (rows as Record<string, unknown>[]).slice(0, maxRows).map(normalizeRow);
      const columns = Object.keys(sliced[0] ?? {}).map((name) => ({ name }));
      return {
        columns,
        rows: sliced,
        rowCount: sliced.length,
        durationMs: Date.now() - start,
        truncated: rows.length > maxRows,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("timeout")) {
        throw new ConnectorError(`Query timed out after ${timeoutMs}ms`, "TIMEOUT");
      }
      throw new ConnectorError(message, "QUERY_FAILED");
    }
  }

  quoteIdentifier(identifier: string): string {
    return `\`${identifier.replaceAll("`", "")}\``;
  }

  async close(): Promise<void> {
    // BigQuery client is stateless HTTP; nothing to close.
  }
}

/** BigQuery returns wrapper objects (Big, BigQueryDate...) — flatten them. */
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v != null && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
      out[k] = (v as { value: unknown }).value;
    } else {
      out[k] = v;
    }
  }
  return out;
}
