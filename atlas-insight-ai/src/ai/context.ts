import "server-only";
import type { ApiContext } from "@/services/api-context";
import { fileTableName } from "@/services/data-sources";
import { semanticModelSchema, type SemanticModel } from "@/semantic/schema";
import type { BusinessRule, Metric } from "@/types";

// Structured AI context. Priority order (spec §32):
// 1. certified metrics, 2. business rules, 3. semantic model,
// 4. data profile, 5. documents, 6. raw schema.
// Secrets and credentials NEVER enter this context.

export interface RawSchemaTable {
  /** Physical identifier the SQL must reference (e.g. "file_data.f_ab12cd"). */
  table: string;
  /** Friendly logical name shown to the user (e.g. "orcamento_pessoal"). */
  label: string;
  /** Analysis context (Looker-style subject) this table belongs to. */
  context: string | null;
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
  preferredDataSourceId?: string,
  analysisContext?: string
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
  // Table identifiers are PHYSICAL (what the SQL engine executes); logical
  // names are kept as labels so the AI can map user vocabulary to them.
  const dataSourceId = preferredDataSourceId ?? modelRow?.data_source_id ?? null;
  const rawSchema: RawSchemaTable[] = [];
  if (dataSourceId) {
    const [{ data: sourceRow }, { data: datasets }] = await Promise.all([
      ctx.supabase.from("data_sources").select("id, type").eq("id", dataSourceId).maybeSingle(),
      ctx.supabase.from("datasets").select("id, name").eq("data_source_id", dataSourceId),
    ]);
    const datasetName = new Map((datasets ?? []).map((d) => [d.id as string, d.name as string]));
    const datasetIds = (datasets ?? []).map((d) => d.id);
    if (datasetIds.length > 0) {
      // `context` só existe após a migração 0011 — fallback sem a coluna.
      type TableRow = { id: string; dataset_id: string; name: string; context?: string | null };
      let tables: TableRow[] = [];
      const withContext = await ctx.supabase
        .from("catalog_tables")
        .select("id, dataset_id, name, context")
        .in("dataset_id", datasetIds);
      if (withContext.error) {
        const plain = await ctx.supabase
          .from("catalog_tables")
          .select("id, dataset_id, name")
          .in("dataset_id", datasetIds);
        tables = (plain.data ?? []) as TableRow[];
      } else {
        tables = (withContext.data ?? []) as TableRow[];
      }
      // Contexto de análise (estilo Looker): quando informado, só as tabelas
      // desse assunto entram no contexto da IA.
      if (analysisContext) {
        tables = tables.filter((t) => (t.context ?? t.name) === analysisContext);
      }
      const tableIds = tables.map((t) => t.id);
      if (tableIds.length > 0) {
        const { data: columns } = await ctx.supabase
          .from("catalog_columns")
          .select("table_id, name, data_type, ordinal, excluded")
          .in("table_id", tableIds)
          .order("ordinal");
        for (const t of tables) {
          const physical =
            sourceRow?.type === "file"
              ? `file_data.${fileTableName(t.id)}`
              : `${datasetName.get(t.dataset_id) ?? "public"}.${t.name}`;
          rawSchema.push({
            table: physical,
            label: t.name,
            context: t.context ?? null,
            columns: (columns ?? [])
              .filter((c) => c.table_id === t.id && !(c as { excluded?: boolean }).excluded)
              .map((c) => ({ name: c.name, type: c.data_type })),
          });
        }
      }
    }
  }

  // Quando um contexto de análise está ativo, o modelo semântico é reduzido
  // às entidades daquele assunto (e aos relacionamentos entre elas).
  if (semanticModel && analysisContext) {
    const inContext = new Set(rawSchema.flatMap((t) => [t.table.toLowerCase(), t.label.toLowerCase()]));
    const bare = new Set(rawSchema.map((t) => t.table.split(".").pop()?.toLowerCase() ?? ""));
    const entities = semanticModel.entities.filter((e) => {
      const lower = e.table.toLowerCase();
      return inContext.has(lower) || bare.has(lower.split(".").pop() ?? lower);
    });
    const entityNames = new Set(entities.map((e) => e.name));
    semanticModel = {
      ...semanticModel,
      entities,
      relationships: semanticModel.relationships.filter(
        (r) => entityNames.has(r.fromEntity) && entityNames.has(r.toEntity)
      ),
    };
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
    contextVersion: `${modelRow?.id ?? "none"}:${modelRow?.version ?? 0}:${(metrics ?? []).length}m:${(rules ?? []).length}r:${rawSchema.length}t${analysisContext ? `:${analysisContext}` : ""}`,
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
        'Always reference tables by their PHYSICAL identifier exactly as written after "Table:". The name in parentheses is only the friendly label users know the data by.\n' +
        context.rawSchema
          .map(
            (t) =>
              `### Table: ${t.table} (known to the user as "${t.label}")${t.context ? ` [subject: ${t.context}]` : ""}\n` +
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
