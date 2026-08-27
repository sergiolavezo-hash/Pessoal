import { z } from "zod";

// Non-secret configuration lives in data_sources.config; secrets live in
// data_source_credentials (encrypted). These schemas define both halves.

export const postgresConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1),
  ssl: z.boolean().default(true),
});

export const postgresCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const sqlServerConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(1433),
  database: z.string().min(1),
  encrypt: z.boolean().default(true),
});

export const sqlServerCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const bigQueryConfigSchema = z.object({
  projectId: z.string().min(1),
  /** Optional default dataset. */
  dataset: z.string().optional(),
  location: z.string().optional(),
});

export const bigQueryCredentialsSchema = z.object({
  /** Full service-account JSON key, pasted by the user. */
  serviceAccountJson: z.string().min(2),
});

export const fileConfigSchema = z.object({
  // File sources have no external connection settings.
});

export const connectorConfigSchemas = {
  postgres: { config: postgresConfigSchema, credentials: postgresCredentialsSchema },
  sqlserver: { config: sqlServerConfigSchema, credentials: sqlServerCredentialsSchema },
  bigquery: { config: bigQueryConfigSchema, credentials: bigQueryCredentialsSchema },
  file: { config: fileConfigSchema, credentials: z.object({}) },
} as const;

export type SupportedConnectorType = keyof typeof connectorConfigSchemas;

export function isSupportedConnectorType(type: string): type is SupportedConnectorType {
  return type in connectorConfigSchemas;
}

export type PostgresConfig = z.infer<typeof postgresConfigSchema>;
export type PostgresCredentials = z.infer<typeof postgresCredentialsSchema>;
export type SqlServerConfig = z.infer<typeof sqlServerConfigSchema>;
export type SqlServerCredentials = z.infer<typeof sqlServerCredentialsSchema>;
export type BigQueryConfig = z.infer<typeof bigQueryConfigSchema>;
export type BigQueryCredentials = z.infer<typeof bigQueryCredentialsSchema>;
