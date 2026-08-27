export interface ConnectorField {
  key: string;
  label: string;
  type: "text" | "number" | "password" | "textarea" | "boolean";
  placeholder?: string;
  secret?: boolean;
  defaultValue?: string | number | boolean;
}

export interface ConnectorDefinition {
  type: string;
  name: string;
  category: "Cloud" | "Databases" | "Lakehouse" | "Files" | "APIs";
  description: string;
  implemented: boolean;
  fields: ConnectorField[];
}

export const CONNECTOR_CATALOG: ConnectorDefinition[] = [
  {
    type: "bigquery",
    name: "BigQuery",
    category: "Cloud",
    description: "Google BigQuery data warehouse",
    implemented: true,
    fields: [
      { key: "projectId", label: "Project ID", type: "text", placeholder: "my-gcp-project" },
      { key: "dataset", label: "Default dataset (optional)", type: "text", placeholder: "analytics" },
      { key: "location", label: "Location (optional)", type: "text", placeholder: "US" },
      {
        key: "serviceAccountJson",
        label: "Service account key (JSON)",
        type: "textarea",
        secret: true,
        placeholder: '{ "type": "service_account", ... }',
      },
    ],
  },
  {
    type: "postgres",
    name: "PostgreSQL",
    category: "Databases",
    description: "PostgreSQL 12+ databases",
    implemented: true,
    fields: [
      { key: "host", label: "Host", type: "text", placeholder: "db.example.com" },
      { key: "port", label: "Port", type: "number", defaultValue: 5432 },
      { key: "database", label: "Database", type: "text" },
      { key: "username", label: "Username", type: "text", secret: true },
      { key: "password", label: "Password", type: "password", secret: true },
      { key: "ssl", label: "Use SSL", type: "boolean", defaultValue: true },
    ],
  },
  {
    type: "sqlserver",
    name: "SQL Server",
    category: "Databases",
    description: "Microsoft SQL Server 2016+",
    implemented: true,
    fields: [
      { key: "host", label: "Host", type: "text" },
      { key: "port", label: "Port", type: "number", defaultValue: 1433 },
      { key: "database", label: "Database", type: "text" },
      { key: "username", label: "Username", type: "text", secret: true },
      { key: "password", label: "Password", type: "password", secret: true },
      { key: "encrypt", label: "Encrypt connection", type: "boolean", defaultValue: true },
    ],
  },
  {
    type: "file",
    name: "CSV / XLSX",
    category: "Files",
    description: "Upload spreadsheet files",
    implemented: true,
    fields: [],
  },
  { type: "snowflake", name: "Snowflake", category: "Cloud", description: "Snowflake data cloud", implemented: false, fields: [] },
  { type: "redshift", name: "Redshift", category: "Cloud", description: "Amazon Redshift", implemented: false, fields: [] },
  { type: "mysql", name: "MySQL", category: "Databases", description: "MySQL / MariaDB", implemented: false, fields: [] },
  { type: "oracle", name: "Oracle", category: "Databases", description: "Oracle Database", implemented: false, fields: [] },
  { type: "azuresql", name: "Azure SQL", category: "Databases", description: "Azure SQL Database", implemented: false, fields: [] },
  { type: "databricks", name: "Databricks", category: "Lakehouse", description: "Databricks SQL warehouse", implemented: false, fields: [] },
  { type: "rest", name: "REST API", category: "APIs", description: "Generic REST API source", implemented: false, fields: [] },
];
