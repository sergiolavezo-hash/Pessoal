import "server-only";
import type { ApiContext } from "@/services/api-context";
import { semanticModelSchema, type SemanticModel } from "@/semantic/schema";
import type { BusinessRule, Metric } from "@/types";

// Structured AI context. Priority order (spec §32):
// 1. certified metrics, 2. business rules, 3. semantic model,
// 4. data profile, 5. documents, 6. raw schema.
// Secrets and credentials NEVER enter this context.

export interface RawSchemaTable {
  table: string;
  columns: Array<{ name: string; type: string }>;
}

export interface WorkspaceAiContext {
  dataSourceId: string | null;
  dialect: "postgres" | "sqlserver" | "bigquery" | null;
  semanticModel: SemanticModel | null;
  semanticModelId: string | null;
  metrics: Metric[];
  businessRules: BusinessRule[];
  glossary: Array<{ term: string; synonyms: string[]; definition: string | null }>;
  /**
   * Physical schema discovered in the catalog for the selected data source.
   * Always included when available — it is the ground truth of which
   * columns exist, even when a semantic model is present.
   */
  rawSchema: RawSchemaTable[];
  /** Physical table identifiers the AI may reference in SQL. */
  allowedTables: string[];
  contextVersion: string;
}

export async function buildWorkspaceContext(
  ctx: ApiContext,
  preferredDataSourceId?: string
): Promise<WorkspaceAiContext> {
  const [{ data: models }, { data: metrics }, { data: rules }, { data: glossary }] = await Promise.all([
    ctx.supabase
      .from("semantic_models")
      .select("id, data_source_id, definition, version, updated_at")
      .eq("workspace_id", ctx.workspaceId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("metrics")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .is("deleted_at", null)
      .neq("status", "DEPRECATED"),
    ctx.supabase
      .from("business_rules")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .eq("status", "ACTIVE"),
    ctx.supabase.from("glossary_terms").select("term, synonyms, definition").eq("workspace_id", ctx.workspaceId),
  ]);

  // When the caller selected a data source, NEVER fall back to another
  // source's semantic model — mixing sources produces invented columns.
  const modelRow = preferredDataSourceId
    ? (models ?? []).find((m) => m.data_source_id === preferredDataSourceId)
    : (models ?? [])[0];

  let semanticModel: SemanticModel | null = null;
  if (modelRow) {
    const parsed = semanticModelSchema.safeParse(modelRow.definition);
    semanticModel = parsed.success ? parsed.data : null;
  }

  // Ground truth: the discovered physical schema of the selected source.
  const dataSourceId = preferredDataSourceId ?? modelRow?.data_source_id ?? null;
  const rawSchema: RawSchemaTable[] = [];
  if (dataSourceId) {
    const { data: datasets } = await ctx.supabase
      .from("datasets")
      .select("id")
      .eq("data_source_id", dataSourceId);
    const datasetIds = (datasets ?? []).map((d) => d.id);
    if (datasetIds.length > 0) {
      const { data: tables } = await ctx.supabase
        .from("catalog_tables")
        .select("id, name")
        .in("dataset_id", datasetIds);
      const tableIds = (tables ?? []).map((t) => t.id);
      if (tableIds.length > 0) {
        const { data: columns } = await ctx.supabase
          .from("catalog_columns")
          .select("table_id, name, data_type, ordinal")
          .in("table_id", tableIds)
          .order("ordinal");
        for (const t of tables ?? []) {
          rawSchema.push({
            table: t.name,
            columns: (columns ?? [])
              .filter((c) => c.table_id === t.id)
              .map((c) => ({ name: c.name, type: c.data_type })),
          });
        }
      }
    }
  }

  // Certified metrics first — the AI must prefer them.
  const sortedMetrics = ((metrics ?? []) as Metric[]).sort(
    (a, b) => Number(b.certified) - Number(a.certified)
  );

  const allowedTables = Array.from(
    new Set([
      ...(semanticModel?.entities.map((e) => e.table) ?? []),
      ...rawSchema.map((t) => t.table),
    ])
  );

  return {
    dataSourceId,
    dialect: semanticModel?.dialect ?? null,
    semanticModel,
    semanticModelId: modelRow?.id ?? null,
    metrics: sortedMetrics,
    businessRules: (rules ?? []) as BusinessRule[],
    glossary: (glossary ?? []).map((g) => ({
      term: g.term,
      synonyms: g.synonyms ?? [],
      definition: g.definition,
    })),
    rawSchema,
    allowedTables,
    contextVersion: `${modelRow?.id ?? "none"}:${modelRow?.version ?? 0}:${(metrics ?? []).length}m:${(rules ?? []).length}r:${rawSchema.length}t`,
  };
}

/** Renders the context as the system-prompt data section for the LLM. */
export function renderContextForPrompt(context: WorkspaceAiContext): string {
  const parts: string[] = [];

  if (context.metrics.length > 0) {
    parts.push(
      "## Governed metrics (ALWAYS prefer these over ad-hoc calculations; certified metrics take priority)\n" +
        context.metrics
          .map(
            (m) =>
              `- ${m.certified ? "[CERTIFIED] " : ""}${m.name} (slug: ${m.slug}, format: ${m.format}): ${m.formula}${m.description ? ` — ${m.description}` : ""}`
          )
          .join("\n")
    );
  }

  if (context.businessRules.length > 0) {
    parts.push(
      "## Business rules (MUST be applied to every relevant query)\n" +
        context.businessRules
          .map((r) => {
            const structured = Object.keys(r.structured_definition ?? {}).length
              ? ` | structured: ${JSON.stringify(r.structured_definition)}`
              : "";
            return `- ${r.name}: ${r.natural_language_definition}${structured}`;
          })
          .join("\n")
    );
  }

  if (context.semanticModel) {
    const m = context.semanticModel;
    parts.push(
      `## Semantic model (dialect: ${m.dialect})\n` +
        m.entities
          .map((e) => {
            const dims = e.fields.filter((f) => f.fieldType === "DIMENSION");
            const measures = e.fields.filter((f) => f.fieldType === "MEASURE");
            return [
              `### Entity: ${e.name} (physical table: ${e.table})${e.primaryKey ? ` [PK: ${e.primaryKey}]` : ""}`,
              dims.length > 0
                ? `Dimensions: ${dims.map((f) => `${f.name} [column: ${f.column}, ${f.dataType ?? "?"}]`).join(", ")}`
                : "",
              measures.length > 0
                ? `Measures: ${measures.map((f) => `${f.name} [column: ${f.column}, agg: ${f.defaultAggregation ?? "SUM"}]`).join(", ")}`
                : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n") +
        (m.relationships.length > 0
          ? "\n\n### Relationships\n" +
            m.relationships
              .map((r) => `- ${r.fromEntity}.${r.fromField} -> ${r.toEntity}.${r.toField} (${r.type})`)
              .join("\n")
          : "")
    );
  }

  if (context.rawSchema.length > 0) {
    parts.push(
      "## Physical schema — GROUND TRUTH\n" +
        "These are the ONLY tables and columns that exist. Any SQL referencing a column not listed here WILL FAIL.\n" +
        context.rawSchema
          .map(
            (t) =>
              `### Table: ${t.table}\n` +
              t.columns.map((c) => `- ${c.name} (${c.type})`).join("\n")
          )
          .join("\n\n")
    );
  }

  if (context.glossary.length > 0) {
    parts.push(
      "## Glossary (workspace vocabulary)\n" +
        context.glossary
          .map((g) => `- ${g.term}${g.synonyms.length ? ` (aka ${g.synonyms.join(", ")})` : ""}${g.definition ? `: ${g.definition}` : ""}`)
          .join("\n")
    );
  }

  return parts.join("\n\n");
}
