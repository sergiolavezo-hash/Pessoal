import "server-only";
import type { ApiContext } from "@/services/api-context";
import { fileTableName } from "@/services/data-sources";
import { semanticModelSchema, type SemanticModel } from "@/semantic/schema";
import type { BusinessRule, Metric } from "@/types";

// Structured AI context. Priority order (spec §32):
// 1. certified metrics, 2. business rules, 3. semantic model,
// 4. data profile, 5. documents, 6. raw schema.
// Secrets and credentials NEVER enter this context.

/**
 * O que o perfilamento descobriu sobre uma coluna. É isto — e não o nome do
 * arquivo ou a ordem das colunas — que permite à IA escolher indicadores:
 * o que é medida, o que é dimensão, o que é tempo, e com que valores.
 */
export interface ProfiledColumn {
  name: string;
  type: string;
  /** MEASURE / DIMENSION / DATE / IDENTIFIER / FOREIGN_KEY / BOOLEAN. */
  role: string | null;
  distinctCount: number | null;
  nullPercentage: number | null;
  min: string | number | null;
  max: string | number | null;
  average: number | null;
  sampleValues: string[];
}

export interface RawSchemaTable {
  /** Physical identifier the SQL must reference (e.g. "file_data.f_ab12cd"). */
  table: string;
  /** Friendly logical name shown to the user (e.g. "orcamento_pessoal"). */
  label: string;
  /** Analysis context (Looker-style subject) this table belongs to. */
  context: string | null;
  rowCount: number | null;
  columns: ProfiledColumn[];
  /** Quantas colunas ficaram de fora do contexto (tabelas muito largas). */
  omittedColumns?: number;
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

/**
 * Tetos do contexto. Uma fonte com dezenas de tabelas geraria um prompt
 * gigante em TODA chamada de IA — e o custo é por token de entrada. Cortamos
 * pelo que cabe numa boa análise, mantendo primeiro o que é útil.
 */
const MAX_CONTEXT_TABLES = 12;
/**
 * Tabelas muito largas (planilhas de exportação chegam a centenas de colunas)
 * precisam caber inteiras sempre que possível. O teto existe apenas para que
 * uma fonte gigantesca não estoure a janela do modelo — e, quando ele é
 * atingido, as colunas ANALITICAMENTE úteis entram primeiro, nunca as
 * primeiras da planilha por acaso.
 */
const MAX_COLUMNS_PER_TABLE = 150;
const MAX_SAMPLE_VALUES = 5;

/** Ordem de utilidade para um painel: o que se agrega, o que quebra, o resto. */
const ROLE_PRIORITY: Record<string, number> = {
  MEASURE: 0,
  DATE: 1,
  CATEGORY: 2,
  DIMENSION: 3,
  BOOLEAN: 4,
  TEXT: 5,
  FOREIGN_KEY: 6,
  ID: 7,
};

function byAnalyticalValue(a: ProfiledColumn, b: ProfiledColumn): number {
  return (ROLE_PRIORITY[a.role ?? ""] ?? 9) - (ROLE_PRIORITY[b.role ?? ""] ?? 9);
}

/** Normaliza a linha de catalog_columns no entendimento usado pelos prompts. */
function toProfiledColumn(row: {
  name: string;
  data_type: string;
  profile?: unknown;
  classification?: unknown;
}): ProfiledColumn {
  const profile = (row.profile ?? {}) as {
    unique_count?: number;
    null_percentage?: number;
    min?: string | number;
    max?: string | number;
    average?: number;
    sample_values?: unknown[];
  };
  // classification é jsonb: {"classification": "MEASURE", "confidence": 0.97}
  const classification = (row.classification ?? {}) as { classification?: string };
  return {
    name: row.name,
    type: row.data_type,
    role: classification.classification ?? null,
    distinctCount: profile.unique_count ?? null,
    nullPercentage: profile.null_percentage ?? null,
    min: profile.min ?? null,
    max: profile.max ?? null,
    average: profile.average ?? null,
    sampleValues: (profile.sample_values ?? [])
      .slice(0, MAX_SAMPLE_VALUES)
      .map((v) => String(v).slice(0, 40)),
  };
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
      type TableRow = {
        id: string;
        dataset_id: string;
        name: string;
        row_count?: number | null;
        context?: string | null;
      };
      let tables: TableRow[] = [];
      const withContext = await ctx.supabase
        .from("catalog_tables")
        .select("id, dataset_id, name, row_count, context")
        .in("dataset_id", datasetIds);
      if (withContext.error) {
        const plain = await ctx.supabase
          .from("catalog_tables")
          .select("id, dataset_id, name, row_count")
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
        // profile/classification vêm do perfilamento (roda no upload) e são o
        // entendimento real dos dados; sem eles, só nome e tipo.
        const { data: columns } = await ctx.supabase
          .from("catalog_columns")
          .select("table_id, name, data_type, ordinal, excluded, profile, classification")
          .in("table_id", tableIds)
          .order("ordinal");
        for (const t of tables) {
          const physical =
            sourceRow?.type === "file"
              ? `file_data.${fileTableName(t.id)}`
              : `${datasetName.get(t.dataset_id) ?? "public"}.${t.name}`;
          const usable = (columns ?? [])
            .filter((c) => c.table_id === t.id && !(c as { excluded?: boolean }).excluded)
            .map((c) => toProfiledColumn(c));
          // Só reordena quando não cabe tudo: assim a ordem original da
          // planilha é preservada no caso comum.
          const kept =
            usable.length <= MAX_COLUMNS_PER_TABLE
              ? usable
              : [...usable].sort(byAnalyticalValue).slice(0, MAX_COLUMNS_PER_TABLE);
          rawSchema.push({
            table: physical,
            label: t.name,
            context: t.context ?? null,
            rowCount: t.row_count ?? null,
            columns: kept,
            omittedColumns: usable.length - kept.length,
          });
        }
      }
    }
  }

  if (rawSchema.length > MAX_CONTEXT_TABLES) {
    rawSchema.sort((a, b) => (b.rowCount ?? 0) - (a.rowCount ?? 0));
    rawSchema.length = MAX_CONTEXT_TABLES;
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

/**
 * Descreve uma tabela como um analista descreveria: papel de cada coluna,
 * quantos valores distintos, faixa e exemplos reais. É o que permite à IA
 * escolher medidas, quebras e tipos de gráfico sem adivinhar pelo nome.
 */
function renderTableUnderstanding(t: RawSchemaTable): string {
  const header =
    `### Table: ${t.table} (known to the user as "${t.label}")` +
    `${t.context ? ` [subject: ${t.context}]` : ""}` +
    `${t.rowCount != null ? ` — ${t.rowCount} rows` : ""}`;

  const columns = t.columns.map((c) => {
    const facts: string[] = [];
    if (c.role) facts.push(`role: ${c.role}`);
    if (c.distinctCount != null) facts.push(`${c.distinctCount} distinct`);
    if (c.min != null || c.max != null) facts.push(`range: ${c.min ?? "?"} … ${c.max ?? "?"}`);
    if (c.average != null) facts.push(`avg: ${c.average}`);
    if (c.nullPercentage != null && c.nullPercentage > 0.05) {
      facts.push(`${Math.round(c.nullPercentage * 100)}% empty`);
    }
    const examples = c.sampleValues.length > 0 ? ` — e.g. ${c.sampleValues.join(", ")}` : "";
    return `- ${c.name} (${c.type}${facts.length ? `; ${facts.join("; ")}` : ""})${examples}`;
  });

  // Um resumo explícito evita que o modelo tenha de deduzir os papéis. Os
  // rótulos vêm do perfilador: MEASURE agrega; CATEGORY/DIMENSION/BOOLEAN
  // agrupam; TEXT/ID/FOREIGN_KEY identificam uma linha e não servem de quebra.
  const byRole = (...roles: string[]) =>
    t.columns.filter((c) => c.role != null && roles.includes(c.role));
  const measures = byRole("MEASURE").map((c) => c.name);
  const dates = byRole("DATE").map((c) => c.name);
  const groupable = byRole("CATEGORY", "DIMENSION", "BOOLEAN")
    .filter((c) => (c.distinctCount ?? 0) > 1)
    .sort((a, b) => (a.distinctCount ?? 0) - (b.distinctCount ?? 0))
    .map((c) => `${c.name} (${c.distinctCount ?? "?"} values)`);
  // Rótulos legíveis (nomes, modelos, descrições) servem para ranking e
  // detalhe; chaves opacas só servem para juntar tabelas. Confundir os dois
  // ou proibir ambos empobrece o painel.
  const labels = byRole("TEXT").map((c) => `${c.name} (${c.distinctCount ?? "?"} values)`);
  const keys = byRole("ID", "FOREIGN_KEY").map((c) => c.name);

  const guide: string[] = [];
  if (measures.length > 0) guide.push(`Measures to aggregate: ${measures.join(", ")}`);
  if (dates.length > 0) guide.push(`Time columns: ${dates.join(", ")}`);
  if (groupable.length > 0) guide.push(`Break down by: ${groupable.join(", ")}`);
  if (labels.length > 0) {
    guide.push(`Labels (use for top-N rankings and detail tables): ${labels.join(", ")}`);
  }
  if (keys.length > 0) {
    guide.push(`Keys (never aggregate; use only to join tables): ${keys.join(", ")}`);
  }
  if (measures.length === 0) {
    guide.push("No numeric measure detected: count records (COUNT(*)) as the metric.");
  }

  if (t.omittedColumns && t.omittedColumns > 0) {
    guide.push(
      `Note: this table has ${t.omittedColumns} further column(s) not listed here (very wide table). Use the ones above.`
    );
  }

  return [header, ...columns, ...(guide.length ? ["", ...guide] : [])].join("\n");
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
      "## Data understanding — GROUND TRUTH\n" +
        "These are the ONLY tables and columns that exist. Any SQL referencing a column not listed here WILL FAIL.\n" +
        'Always reference tables by their PHYSICAL identifier exactly as written after "Table:". The name in parentheses is only the friendly label users know the data by.\n' +
        "Each column carries what profiling actually found in the data: its analytical role, how many distinct values it holds, its range and real example values. USE THIS to decide what to measure and how to break it down — never guess from column names alone.\n\n" +
        context.rawSchema.map(renderTableUnderstanding).join("\n\n")
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
