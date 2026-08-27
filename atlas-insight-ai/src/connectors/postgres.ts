import "server-only";
import { Client } from "pg";
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
import type { PostgresConfig, PostgresCredentials } from "@/connectors/config-schemas";

const SYSTEM_SCHEMAS = ["pg_catalog", "information_schema", "pg_toast"];

export class PostgresConnector implements DataConnector {
  readonly dialect = "postgres" as const;

  constructor(
    private readonly config: PostgresConfig,
    private readonly credentials: PostgresCredentials
  ) {}

  private async withClient<T>(fn: (client: Client) => Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.credentials.username,
      password: this.credentials.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10_000,
      statement_timeout: timeoutMs,
      query_timeout: timeoutMs + 2_000,
    });
    try {
      await client.connect();
    } catch (error) {
      throw new ConnectorError(
        `Could not connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`,
        "CONNECTION_FAILED"
      );
    }
    try {
      // Defense in depth: the whole session is read-only.
      await client.query("SET default_transaction_read_only = on");
      return await fn(client);
    } finally {
      await client.end().catch(() => {});
    }
  }

  async testConnection(): Promise<ConnectionResult> {
    const start = Date.now();
    try {
      await this.withClient((c) => c.query("SELECT 1"));
      return { ok: true, message: "Connection successful", latencyMs: Date.now() - start };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Connection failed" };
    }
  }

  async getMetadata(): Promise<DataMetadata> {
    const schemas = await this.listSchemas();
    return { dialect: this.dialect, schemas, defaultSchema: "public" };
  }

  async listSchemas(): Promise<SchemaInfo[]> {
    return this.withClient(async (c) => {
      const res = await c.query(
        `SELECT schema_name FROM information_schema.schemata
         WHERE schema_name NOT IN (${SYSTEM_SCHEMAS.map((_, i) => `$${i + 1}`).join(", ")})
         ORDER BY schema_name`,
        SYSTEM_SCHEMAS
      );
      return res.rows.map((r) => ({ name: r.schema_name as string }));
    });
  }

  async listTables(schema = "public"): Promise<TableInfo[]> {
    return this.withClient(async (c) => {
      const res = await c.query(
        `SELECT t.table_schema, t.table_name, c.reltuples::bigint AS approx_rows
         FROM information_schema.tables t
         LEFT JOIN pg_class c
           ON c.relname = t.table_name
          AND c.relnamespace = t.table_schema::regnamespace
         WHERE t.table_schema = $1 AND t.table_type IN ('BASE TABLE', 'VIEW')
         ORDER BY t.table_name`,
        [schema]
      );
      return res.rows.map((r) => ({
        schema: r.table_schema as string,
        name: r.table_name as string,
        rowCount: r.approx_rows != null && Number(r.approx_rows) >= 0 ? Number(r.approx_rows) : null,
      }));
    });
  }

  async getColumns(table: string, schema = "public"): Promise<ColumnInfo[]> {
    return this.withClient(async (c) => {
      const res = await c.query(
        `SELECT column_name, data_type, is_nullable, ordinal_position
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schema, table]
      );
      return res.rows.map((r) => ({
        name: r.column_name as string,
        dataType: r.data_type as string,
        nullable: r.is_nullable === "YES",
        ordinal: Number(r.ordinal_position),
      }));
    });
  }

  async getSampleData(table: string, limit = SAMPLE_LIMIT, schema = "public"): Promise<Record<string, unknown>[]> {
    const result = await this.executeQuery(
      `SELECT * FROM ${this.quoteIdentifier(schema)}.${this.quoteIdentifier(table)} LIMIT ${Math.min(limit, 1000)}`
    );
    return result.rows;
  }

  async executeQuery(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const start = Date.now();
    return this.withClient(async (c) => {
      try {
        const res = await c.query(query);
        const rows = res.rows.slice(0, maxRows) as Record<string, unknown>[];
        return {
          columns: res.fields.map((f) => ({ name: f.name, type: String(f.dataTypeID) })),
          rows,
          rowCount: rows.length,
          durationMs: Date.now() - start,
          truncated: res.rows.length > maxRows,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("statement timeout")) {
          throw new ConnectorError(`Query timed out after ${timeoutMs}ms`, "TIMEOUT");
        }
        throw new ConnectorError(message, "QUERY_FAILED");
      }
    }, timeoutMs);
  }

  quoteIdentifier(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
  }

  async close(): Promise<void> {
    // Clients are per-call; nothing to close.
  }
}
