// Common connector contract. Every data source adapter implements this
// interface — no connector-specific code may leak into the rest of the app.

export interface ConnectionResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface SchemaInfo {
  name: string;
}

export interface TableInfo {
  schema: string;
  name: string;
  rowCount?: number | null;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  ordinal: number;
}

export interface QueryOptions {
  /** Hard cap on returned rows. Connectors must enforce it server-side. */
  maxRows?: number;
  /** Statement timeout in milliseconds. */
  timeoutMs?: number;
  /** Named parameters for parameterized execution where supported. */
  params?: Record<string, unknown>;
}

export interface QueryResult {
  columns: Array<{ name: string; type?: string }>;
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  truncated: boolean;
}

export interface DataMetadata {
  dialect: SqlDialect;
  schemas: SchemaInfo[];
  defaultSchema?: string;
}

export type SqlDialect = "bigquery" | "postgres" | "sqlserver";

export interface DataConnector {
  readonly dialect: SqlDialect;
  testConnection(): Promise<ConnectionResult>;
  getMetadata(): Promise<DataMetadata>;
  listSchemas(): Promise<SchemaInfo[]>;
  listTables(schema?: string): Promise<TableInfo[]>;
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>;
  getSampleData(table: string, limit?: number, schema?: string): Promise<Record<string, unknown>[]>;
  /**
   * Executes a read-only query. Callers MUST validate the SQL with
   * `validateReadOnlySql` before calling; connectors additionally enforce
   * read-only sessions where the engine supports it.
   */
  executeQuery(query: string, options?: QueryOptions): Promise<QueryResult>;
  /** Quotes an identifier for this dialect. */
  quoteIdentifier(identifier: string): string;
  close(): Promise<void>;
}

export class ConnectorError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONNECTION_FAILED"
      | "AUTH_FAILED"
      | "QUERY_FAILED"
      | "TIMEOUT"
      | "NOT_SUPPORTED"
      | "BLOCKED" = "QUERY_FAILED"
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}

export const DEFAULT_MAX_ROWS = 10_000;
export const DEFAULT_TIMEOUT_MS = 30_000;
export const SAMPLE_LIMIT = 100;
