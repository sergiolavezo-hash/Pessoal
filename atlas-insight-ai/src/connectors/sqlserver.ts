import "server-only";
import sql from "mssql";
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
import type { SqlServerConfig, SqlServerCredentials } from "@/connectors/config-schemas";

const SYSTEM_SCHEMAS = new Set(["sys", "INFORMATION_SCHEMA", "guest", "db_owner", "db_accessadmin",
  "db_securityadmin", "db_ddladmin", "db_backupoperator", "db_datareader", "db_datawriter",
  "db_denydatareader", "db_denydatawriter"]);

export class SqlServerConnector implements DataConnector {
  readonly dialect = "sqlserver" as const;

  constructor(
    private readonly config: SqlServerConfig,
    private readonly credentials: SqlServerCredentials
  ) {}

  private async withPool<T>(fn: (pool: sql.ConnectionPool) => Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await new sql.ConnectionPool({
        server: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.credentials.username,
        password: this.credentials.password,
        connectionTimeout: 10_000,
        requestTimeout: timeoutMs,
        options: {
          encrypt: this.config.encrypt,
          trustServerCertificate: true,
        },
        pool: { max: 1, min: 0 },
      }).connect();
    } catch (error) {
      throw new ConnectorError(
        `Could not connect to SQL Server: ${error instanceof Error ? error.message : String(error)}`,
        "CONNECTION_FAILED"
      );
    }
    try {
      return await fn(pool);
    } finally {
      await pool.close().catch(() => {});
    }
  }

  async testConnection(): Promise<ConnectionResult> {
    const start = Date.now();
    try {
      await this.withPool((p) => p.request().query("SELECT 1 AS ok"));
      return { ok: true, message: "Connection successful", latencyMs: Date.now() - start };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Connection failed" };
    }
  }

  async getMetadata(): Promise<DataMetadata> {
    const schemas = await this.listSchemas();
    return { dialect: this.dialect, schemas, defaultSchema: "dbo" };
  }

  async listSchemas(): Promise<SchemaInfo[]> {
    return this.withPool(async (p) => {
      const res = await p.request().query(
        `SELECT name FROM sys.schemas ORDER BY name`
      );
      return res.recordset
        .map((r) => ({ name: r.name as string }))
        .filter((s) => !SYSTEM_SCHEMAS.has(s.name));
    });
  }

  async listTables(schema = "dbo"): Promise<TableInfo[]> {
    return this.withPool(async (p) => {
      const req = p.request();
      req.input("schema", sql.NVarChar, schema);
      const res = await req.query(
        `SELECT s.name AS schema_name, t.name AS table_name, SUM(ps.row_count) AS row_count
         FROM sys.tables t
         JOIN sys.schemas s ON s.schema_id = t.schema_id
         LEFT JOIN sys.dm_db_partition_stats ps
           ON ps.object_id = t.object_id AND ps.index_id IN (0, 1)
         WHERE s.name = @schema
         GROUP BY s.name, t.name
         ORDER BY t.name`
      );
      return res.recordset.map((r) => ({
        schema: r.schema_name as string,
        name: r.table_name as string,
        rowCount: r.row_count != null ? Number(r.row_count) : null,
      }));
    });
  }

  async getColumns(table: string, schema = "dbo"): Promise<ColumnInfo[]> {
    return this.withPool(async (p) => {
      const req = p.request();
      req.input("schema", sql.NVarChar, schema);
      req.input("table", sql.NVarChar, table);
      const res = await req.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, ORDINAL_POSITION
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
         ORDER BY ORDINAL_POSITION`
      );
      return res.recordset.map((r) => ({
        name: r.COLUMN_NAME as string,
        dataType: r.DATA_TYPE as string,
        nullable: r.IS_NULLABLE === "YES",
        ordinal: Number(r.ORDINAL_POSITION),
      }));
    });
  }

  async getSampleData(table: string, limit = SAMPLE_LIMIT, schema = "dbo"): Promise<Record<string, unknown>[]> {
    const result = await this.executeQuery(
      `SELECT TOP ${Math.min(limit, 1000)} * FROM ${this.quoteIdentifier(schema)}.${this.quoteIdentifier(table)}`
    );
    return result.rows;
  }

  async executeQuery(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const start = Date.now();
    return this.withPool(async (p) => {
      try {
        const res = await p.request().query(query);
        const all = res.recordset ?? [];
        const rows = all.slice(0, maxRows) as Record<string, unknown>[];
        const columns = res.recordset?.columns
          ? Object.values(res.recordset.columns).map((c) => ({ name: c.name, type: String(c.type) }))
          : Object.keys(rows[0] ?? {}).map((name) => ({ name }));
        return {
          columns,
          rows,
          rowCount: rows.length,
          durationMs: Date.now() - start,
          truncated: all.length > maxRows,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("timeout")) {
          throw new ConnectorError(`Query timed out after ${timeoutMs}ms`, "TIMEOUT");
        }
        throw new ConnectorError(message, "QUERY_FAILED");
      }
    }, timeoutMs);
  }

  quoteIdentifier(identifier: string): string {
    return `[${identifier.replaceAll("]", "]]")}]`;
  }

  async close(): Promise<void> {
    // Pools are per-call; nothing to close.
  }
}
