import "server-only";
import type { ApiContext } from "@/services/api-context";
import { semanticModelSchema, type SemanticModel } from "@/semantic/schema";
import type { BusinessRule, Metric } from "@/types";

// Structured AI context. Priority order (spec §32):
// 1. certified metrics, 2. business rules, 3. semantic model,
// 4. data profile, 5. documents, 6. raw schema.
// Secrets and credentials NEVER enter this context.

export interface WorkspaceAiContext {
  dataSourceId: string | null;
  dialect: "postgres" | "sqlserver" | "bigquery" | null;
  semanticModel: SemanticModel | null;
  semanticModelId: string | null;
  metrics: Metric[];
  businessRules: BusinessRule[];
  glossary: Array<{ term: string; synonyms: string[]; definition: string | null }>;
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

  const preferredModel = preferredDataSourceId
    ? (models ?? []).find((m) => m.data_source_id === preferredDataSourceId)
    : undefined;
  const modelRow = preferredModel ?? (models ?? [])[0];

  let semanticModel: SemanticModel | null = null;
  if (modelRow) {
    const parsed = semanticModelSchema.safeParse(modelRow.definition);
    semanticModel = parsed.success ? parsed.data : null;
  }

  // Certified metrics first — the AI must prefer them.
  const sortedMetrics = ((metrics ?? []) as Metric[]).sort(
    (a, b) => Number(b.certified) - Number(a.certified)
  );

  return {
    dataSourceId: modelRow?.data_source_id ?? preferredDataSourceId ?? null,
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
    allowedTables: semanticModel?.entities.map((e) => e.table) ?? [],
    contextVersion: `${modelRow?.id ?? "none"}:${modelRow?.version ?? 0}:${(metrics ?? []).length}m:${(rules ?? []).length}r`,
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
