# Connectors

Every data source implements the `DataConnector` interface
(`src/connectors/types.ts`):

```ts
interface DataConnector {
  dialect: "bigquery" | "postgres" | "sqlserver";
  testConnection(): Promise<ConnectionResult>;
  getMetadata(): Promise<DataMetadata>;
  listSchemas(): Promise<SchemaInfo[]>;
  listTables(schema?): Promise<TableInfo[]>;
  getColumns(table, schema?): Promise<ColumnInfo[]>;
  getSampleData(table, limit?, schema?): Promise<Record<string, unknown>[]>;
  executeQuery(query, options?): Promise<QueryResult>;
  quoteIdentifier(id): string;
  close(): Promise<void>;
}
```

Adapters: `PostgresConnector` (pg), `SqlServerConnector` (mssql),
`BigQueryConnector` (@google-cloud/bigquery), `FileConnector` (uploaded
CSV/XLSX). The factory `createConnector()` in `src/connectors/index.ts` is
the only place aware of concrete types — adding Snowflake/Redshift/
Databricks means one new adapter + one factory case + a config schema in
`config-schemas.ts` + a catalog entry in
`src/features/data-sources/connector-catalog.ts`.

## Read-only guarantees

- App-level: `validateReadOnlySql` runs before every execution.
- Postgres: `SET default_transaction_read_only = on` per session.
- BigQuery: `maximumBytesBilled` (10 GB) + job timeout for cost control.
- Files: queries run under the SELECT-only `atlas_file_reader` role.
- All: statement timeout (`QUERY_TIMEOUT_MS`) and row cap (`QUERY_MAX_ROWS`).

## Configuration vs credentials

Non-secret config (host, port, database, project id) is stored in
`data_sources.config` (jsonb, RLS-visible). Secrets (username/password,
service-account JSON) are Zod-validated, encrypted (AES-256-GCM) and stored
in `data_source_credentials`, readable only by the service role and only
server-side. The frontend never receives credentials.

## File sources (CSV / XLSX)

Uploads are parsed server-side (`src/services/file-ingest.ts`): header
sanitization, type inference (bigint / double precision / boolean / date /
timestamptz / text), value coercion, warnings for extra sheets/truncation.
Each file becomes a **real Postgres table** in the `file_data` schema
(`f_<catalog-table-uuid>`), so file data is queryable with genuine SQL. The
raw file is kept in Storage for reprocessing.
