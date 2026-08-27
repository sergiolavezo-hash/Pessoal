import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataSource } from "@/types";
import { ConnectorError, type DataConnector } from "@/connectors/types";
import {
  bigQueryConfigSchema,
  bigQueryCredentialsSchema,
  postgresConfigSchema,
  postgresCredentialsSchema,
  sqlServerConfigSchema,
  sqlServerCredentialsSchema,
} from "@/connectors/config-schemas";
import { PostgresConnector } from "@/connectors/postgres";
import { SqlServerConnector } from "@/connectors/sqlserver";
import { BigQueryConnector } from "@/connectors/bigquery";
import { FileConnector } from "@/connectors/file";

/**
 * Connector factory. Adding a new source type means adding an adapter and a
 * case here — nothing else in the app changes.
 */
export function createConnector(
  dataSource: Pick<DataSource, "id" | "workspace_id" | "type" | "config">,
  credentials: Record<string, unknown>,
  admin: SupabaseClient
): DataConnector {
  switch (dataSource.type) {
    case "postgres":
      return new PostgresConnector(
        postgresConfigSchema.parse(dataSource.config),
        postgresCredentialsSchema.parse(credentials)
      );
    case "sqlserver":
      return new SqlServerConnector(
        sqlServerConfigSchema.parse(dataSource.config),
        sqlServerCredentialsSchema.parse(credentials)
      );
    case "bigquery":
      return new BigQueryConnector(
        bigQueryConfigSchema.parse(dataSource.config),
        bigQueryCredentialsSchema.parse(credentials)
      );
    case "file":
      return new FileConnector(admin, dataSource.workspace_id, dataSource.id);
    default:
      throw new ConnectorError(`Connector type "${dataSource.type}" is not implemented yet`, "NOT_SUPPORTED");
  }
}
