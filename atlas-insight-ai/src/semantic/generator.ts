import "server-only";
import { fileTableName } from "@/services/data-sources";
import type { ApiContext } from "@/services/api-context";
import { ApiError } from "@/services/api-context";
import {
  semanticModelSchema,
  type SemanticEntity,
  type SemanticField,
  type SemanticModel,
} from "@/semantic/schema";
import type { ColumnClassification } from "@/types";

function titleCase(name: string): string {
  return name
    .replaceAll(/[_-]+/g, " ")
    .replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1));
}

function fieldTypeFor(classification?: ColumnClassification): SemanticField["fieldType"] {
  switch (classification) {
    case "MEASURE":
      return "MEASURE";
    case "DIMENSION":
    case "CATEGORY":
    case "DATE":
    case "BOOLEAN":
      return "DIMENSION";
    default:
      return "ATTRIBUTE";
  }
}

/**
 * Builds a semantic model draft from the profiled catalog of a data source
 * and persists it (versioned). Users refine it afterwards.
 */
export async function generateSemanticModel(ctx: ApiContext, dataSourceId: string) {
  const { data: source } = await ctx.supabase
    .from("data_sources")
    .select("id, name, type, workspace_id")
    .eq("id", dataSourceId)
    .eq("workspace_id", ctx.workspaceId)
    .single();
  if (!source) throw new ApiError(404, "Data source not found");

  const { data: tables } = await ctx.supabase
    .from("catalog_tables")
    .select("id, name, datasets!inner(name, data_source_id)")
    .eq("datasets.data_source_id", dataSourceId);
  if (!tables || tables.length === 0) {
    throw new ApiError(422, "No cataloged tables. Run schema sync and profiling first.");
  }

  const tableIds = tables.map((t) => t.id);
  const { data: columns } = await ctx.supabase
    .from("catalog_columns")
    .select("id, table_id, name, data_type, classification, profile, excluded")
    .in("table_id", tableIds)
    .order("ordinal");

  const usableColumns = (columns ?? []).filter((c) => !(c as { excluded?: boolean }).excluded);

  const { data: relationships } = await ctx.supabase
    .from("catalog_relationships")
    .select("source_column_id, target_column_id, relationship_type, confidence")
    .eq("workspace_id", ctx.workspaceId);

  const columnById = new Map(usableColumns.map((c) => [c.id, c]));
  const tableById = new Map(tables.map((t) => [t.id, t]));

  const entities: SemanticEntity[] = tables.map((table) => {
    const dataset = table.datasets as unknown as { name: string };
    const physical =
      source.type === "file" ? `file_data.${fileTableName(table.id)}` : `${dataset.name}.${table.name}`;
    const tableColumns = usableColumns.filter((c) => c.table_id === table.id);
    const pk = tableColumns.find((c) => c.classification?.classification === "ID");

    const fields: SemanticField[] = tableColumns.map((c) => {
      const classification = c.classification?.classification as ColumnClassification | undefined;
      const fieldType = fieldTypeFor(classification);
      const isCurrency = /revenue|amount|price|cost|total|valor|receita|faturamento|custo/i.test(c.name);
      return {
        name: titleCase(c.name),
        column: c.name,
        fieldType,
        dataType: c.data_type,
        defaultAggregation: fieldType === "MEASURE" ? "SUM" : undefined,
        format: fieldType === "MEASURE" ? (isCurrency ? "currency" : "number") : undefined,
        synonyms: [],
        confidence: c.classification?.confidence,
      };
    });

    return {
      name: titleCase(table.name),
      description: undefined,
      table: physical,
      tableId: table.id,
      primaryKey: pk?.name,
      fields,
    };
  });

  const entityByTableId = new Map(entities.map((e) => [e.tableId, e]));
  const modelRelationships = (relationships ?? [])
    .map((r) => {
      const sourceCol = columnById.get(r.source_column_id);
      const targetCol = columnById.get(r.target_column_id);
      if (!sourceCol || !targetCol) return null;
      const fromEntity = entityByTableId.get(sourceCol.table_id);
      const toEntity = entityByTableId.get(targetCol.table_id);
      if (!fromEntity || !toEntity) return null;
      if (!tableById.has(sourceCol.table_id) || !tableById.has(targetCol.table_id)) return null;
      return {
        fromEntity: fromEntity.name,
        fromField: sourceCol.name,
        toEntity: toEntity.name,
        toField: targetCol.name,
        type: r.relationship_type as "many-to-one",
        confidence: Number(r.confidence),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const dialect = source.type === "file" ? "postgres" : (source.type as "postgres" | "sqlserver" | "bigquery");

  const model: SemanticModel = semanticModelSchema.parse({
    name: `${source.name} model`,
    description: `Semantic model generated from ${source.name}`,
    dialect,
    entities,
    relationships: modelRelationships,
  });

  // Versioning: a new generation supersedes the previous ACTIVE model.
  const { data: latest } = await ctx.supabase
    .from("semantic_models")
    .select("version")
    .eq("workspace_id", ctx.workspaceId)
    .eq("data_source_id", dataSourceId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (latest?.version ?? 0) + 1;

  await ctx.supabase
    .from("semantic_models")
    .update({ status: "ARCHIVED" })
    .eq("workspace_id", ctx.workspaceId)
    .eq("data_source_id", dataSourceId)
    .eq("status", "ACTIVE");

  const { data: saved, error } = await ctx.supabase
    .from("semantic_models")
    .insert({
      workspace_id: ctx.workspaceId,
      data_source_id: dataSourceId,
      name: model.name,
      version,
      status: "ACTIVE",
      definition: model,
      created_by: ctx.user.id,
    })
    .select()
    .single();
  if (error || !saved) throw new ApiError(500, error?.message ?? "Failed to save semantic model");

  return { semanticModel: saved, entityCount: entities.length, relationshipCount: modelRelationships.length };
}
