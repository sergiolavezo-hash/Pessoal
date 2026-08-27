import type { DataSourceKind } from "@/types/domain";

/**
 * Contrato único de conectores (spec §14): cada fonte de dados —
 * BigQuery, PostgreSQL, SQL Server, arquivos — implementa esta
 * interface. O motor de consultas só conhece o contrato, nunca o driver.
 */

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs?: number;
  serverVersion?: string;
  error?: string;
}

export interface TableRef {
  schema: string | null;
  name: string;
  kind: "TABLE" | "VIEW";
  rowCountEstimate?: number | null;
}

export interface ColumnRef {
  name: string;
  dataType: string;
  nullable: boolean;
  ordinal: number;
}

export interface QueryResult {
  columns: Array<{ name: string; type: string }>;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
}

export interface QueryOptions {
  /** Teto de linhas retornadas — o guard aplica LIMIT quando ausente. */
  maxRows?: number;
  /** Timeout de execução em ms. */
  timeoutMs?: number;
}

/**
 * Um conector recebe credenciais JÁ decifradas (objeto), vindas do
 * serviço de credenciais — nunca lê variáveis de ambiente nem persiste
 * segredos.
 */
export interface DataConnector {
  readonly kind: DataSourceKind;

  /** Valida conectividade e credenciais sem efeitos colaterais. */
  testConnection(): Promise<ConnectionTestResult>;

  /** Lista tabelas e views visíveis. */
  listTables(): Promise<TableRef[]>;

  /** Lista colunas de uma tabela. */
  listColumns(table: TableRef): Promise<ColumnRef[]>;

  /**
   * Executa uma consulta de LEITURA. Implementações devem chamar o
   * sql-guard antes de tocar o driver — defesa em profundidade mesmo
   * que o chamador já tenha validado.
   */
  query(sql: string, options?: QueryOptions): Promise<QueryResult>;

  /** Libera pools/handles. Idempotente. */
  close(): Promise<void>;
}

export type ConnectorFactory = (
  config: Record<string, unknown>,
  credentials: Record<string, unknown>
) => DataConnector;
