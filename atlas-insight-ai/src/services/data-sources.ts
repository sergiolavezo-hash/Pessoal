import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConnector } from "@/connectors";
import type { DataConnector } from "@/connectors/types";
import { loadCredentials } from "@/services/credentials";
import type { ApiContext } from "@/services/api-context";
import { ApiError } from "@/services/api-context";
import type { DataSource } from "@/types";

/** Physical table name in the file_data schema for an uploaded file table. */
export function fileTableName(catalogTableId: string): string {
  return `f_${catalogTableId.replaceAll("-", "")}`;
}

export async function getDataSource(ctx: ApiContext, dataSourceId: string): Promise<DataSource> {
  const { data, error } = await ctx.supabase
    .from("data_sources")
    .select("*")
    .eq("id", dataSourceId)
    .eq("workspace_id", ctx.workspaceId)
    .is("deleted_at", null)
    .single();
  if (error || !data) throw new ApiError(404, "Data source not found");
  return data as DataSource;
}

export async function getConnectorFor(
  ctx: ApiContext,
  dataSourceId: string
): Promise<{ dataSource: DataSource; connector: DataConnector; admin: SupabaseClient }> {
  const dataSource = await getDataSource(ctx, dataSourceId);
  const admin = createAdminClient();
  const credentials = dataSource.type === "file" ? {} : await loadCredentials(admin, dataSource.id);
  const connector = createConnector(dataSource, credentials, admin);
  return { dataSource, connector, admin };
}

/**
 * Data discovery: schemas -> tables -> columns, persisted to the catalog.
 * Samples and profiling run separately (see data-profiler).
 */
export async function syncDataSource(ctx: ApiContext, dataSourceId: string) {
  const { dataSource, connector } = await getConnectorFor(ctx, dataSourceId);
  const supabase = ctx.supabase;

  // Fontes de arquivo: o catálogo é mantido pelo upload (dataset "files").
  // Sincronizar pelo conector duplicaria as tabelas sob o schema físico
  // "file_data" — em vez disso, remove duplicatas antigas e retorna.
  if (dataSource.type === "file") {
    await connector.close().catch(() => undefined);
    const { data: stray } = await supabase
      .from("datasets")
      .select("id, name")
      .eq("data_source_id", dataSource.id)
      .neq("name", "files");
    for (const ds of stray ?? []) {
      await supabase.from("datasets").delete().eq("id", ds.id);
    }
    const { count } = await supabase
      .from("catalog_tables")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId);
    await supabase
      .from("data_sources")
      .update({ status: "CONNECTED", last_sync_at: new Date().toISOString(), last_error: null })
      .eq("id", dataSource.id);
    return { schemas: 1, tables: count ?? 0, columns: 0, note: "file catalog managed by uploads" };
  }

  await supabase.from("data_sources").update({ status: "SYNCING" }).eq("id", dataSource.id);

  try {
    const schemas = await connector.listSchemas();
    const summary = { schemas: 0, tables: 0, columns: 0 };

    for (const schema of schemas) {
      const tables = await connector.listTables(schema.name);
      if (tables.length === 0) continue;
      summary.schemas += 1;

      const { data: dataset, error: dsError } = await supabase
        .from("datasets")
        .upsert(
          { workspace_id: ctx.workspaceId, data_source_id: dataSource.id, name: schema.name },
          { onConflict: "data_source_id,name" }
        )
        .select()
        .single();
      if (dsError || !dataset) throw new Error(dsError?.message ?? "Failed to save dataset");

      for (const table of tables) {
        const { data: tableRow, error: tError } = await supabase
          .from("catalog_tables")
          .upsert(
            {
              workspace_id: ctx.workspaceId,
              dataset_id: dataset.id,
              name: table.name,
              row_count: table.rowCount ?? null,
            },
            { onConflict: "dataset_id,name" }
          )
          .select()
          .single();
        if (tError || !tableRow) throw new Error(tError?.message ?? "Failed to save table");
        summary.tables += 1;

        const columns = await connector.getColumns(table.name, schema.name);
        for (const col of columns) {
          const { error: cError } = await supabase.from("catalog_columns").upsert(
            {
              workspace_id: ctx.workspaceId,
              table_id: tableRow.id,
              name: col.name,
              data_type: col.dataType,
              ordinal: col.ordinal,
              nullable: col.nullable,
            },
            { onConflict: "table_id,name" }
          );
          if (cError) throw new Error(cError.message);
          summary.columns += 1;
        }
      }
    }

    await supabase
      .from("data_sources")
      .update({ status: "CONNECTED", last_sync_at: new Date().toISOString(), last_error: null })
      .eq("id", dataSource.id);

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await supabase
      .from("data_sources")
      .update({ status: "ERROR", last_error: message })
      .eq("id", dataSource.id);
    throw error;
  } finally {
    await connector.close();
  }
}
