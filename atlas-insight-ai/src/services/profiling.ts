import "server-only";
import { profileColumn } from "@/data-profiler/profiler";
import { detectRelationships, type ProfiledColumnRef } from "@/data-profiler/relationships";
import { getConnectorFor, fileTableName } from "@/services/data-sources";
import type { ApiContext } from "@/services/api-context";

const PROFILE_SAMPLE_ROWS = 1_000;

/**
 * Profiles every cataloged table of a data source: samples rows, computes
 * column statistics + classification, then infers relationships.
 */
export async function profileDataSource(ctx: ApiContext, dataSourceId: string) {
  const { dataSource, connector } = await getConnectorFor(ctx, dataSourceId);

  const { data: tables, error } = await ctx.supabase
    .from("catalog_tables")
    .select("id, name, dataset_id, datasets!inner(name, data_source_id)")
    .eq("datasets.data_source_id", dataSourceId);
  if (error) throw new Error(error.message);

  const profiledColumns: ProfiledColumnRef[] = [];
  let tablesProfiled = 0;

  try {
    for (const table of tables ?? []) {
      const dataset = table.datasets as unknown as { name: string };
      const isFile = dataSource.type === "file";
      const physicalTable = isFile ? fileTableName(table.id) : table.name;
      const schema = isFile ? undefined : dataset.name;

      let rows: Record<string, unknown>[];
      try {
        rows = await connector.getSampleData(physicalTable, PROFILE_SAMPLE_ROWS, schema);
      } catch {
        continue; // Skip unreadable tables; keep profiling the rest.
      }

      const { data: columns } = await ctx.supabase
        .from("catalog_columns")
        .select("id, name, data_type")
        .eq("table_id", table.id);

      for (const column of columns ?? []) {
        const values = rows.map((r) => r[column.name]);
        const result = profileColumn(column.name, column.data_type, values);
        await ctx.supabase
          .from("catalog_columns")
          .update({ profile: result.profile, classification: result.classification })
          .eq("id", column.id);

        profiledColumns.push({
          id: column.id,
          tableId: table.id,
          tableName: table.name,
          name: column.name,
          dataType: column.data_type,
          classification: result.classification.classification,
          cardinality: result.profile.cardinality,
          uniqueCount: result.profile.unique_count,
        });
      }

      await ctx.supabase
        .from("catalog_tables")
        .update({ profiled_at: new Date().toISOString() })
        .eq("id", table.id);
      tablesProfiled += 1;
    }
  } finally {
    await connector.close();
  }

  // Relationship detection across all profiled columns of this source.
  const relationships = detectRelationships(profiledColumns);
  for (const rel of relationships) {
    await ctx.supabase.from("catalog_relationships").upsert(
      {
        workspace_id: ctx.workspaceId,
        source_column_id: rel.sourceColumnId,
        target_column_id: rel.targetColumnId,
        relationship_type: rel.relationshipType,
        confidence: rel.confidence,
        reason: rel.reason,
        source: "inferred",
      },
      { onConflict: "source_column_id,target_column_id" }
    );
  }

  return {
    tables: tablesProfiled,
    columns: profiledColumns.length,
    relationships: relationships.length,
  };
}
