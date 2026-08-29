import { z } from "zod";

// DashboardSpecification — the ONLY contract between the AI and the UI.
// The LLM can only produce widgets of supported types; the frontend never
// receives an unvalidated spec.

export const WIDGET_TYPES = [
  "kpi",
  "line",
  "bar",
  "horizontal_bar",
  "stacked_bar",
  "area",
  "scatter",
  "table",
  "ranking",
  "heatmap",
  "funnel",
  "map",
  "gauge",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export const widgetQuerySchema = z.object({
  /** Validated read-only SQL producing this widget's data. */
  sql: z.string().min(1),
  /** Metric slugs this query is based on (evidence/lineage). */
  metrics: z.array(z.string()).default([]),
  /** Human description of what the query computes. */
  explanation: z.string().optional(),
});

export const widgetSchema = z.object({
  id: z.string().min(1),
  /**
   * Tipos antigos continuam sendo ACEITOS e convertidos, nunca recusados.
   * Painéis gerados antes de o gráfico de pizza sair do produto ficariam com
   * "especificação inválida" e parariam de abrir — o usuário perderia um
   * painel que funcionava por causa de uma decisão de estilo nossa.
   */
  type: z.preprocess(
    (value) => (value === "donut" || value === "pie" ? "horizontal_bar" : value),
    z.enum(WIDGET_TYPES)
  ),
  title: z.string().min(1),
  description: z.string().optional(),
  query: widgetQuerySchema,
  /** Column of the result to use for category/x axis. */
  xField: z.string().optional(),
  /** Columns of the result plotted as series/values. */
  yFields: z.array(z.string()).default([]),
  format: z.enum(["number", "currency", "percent", "decimal"]).optional(),
  /**
   * Posição na grade de 12 colunas. Calculada pela aplicação
   * (applyDashboardLayout), não pelo modelo — LLMs produzem linhas
   * desalinhadas e sobreposições. O default existe só para aceitar
   * especificações sem layout vindas do modelo.
   */
  layout: z
    .object({
      x: z.number().int().min(0).max(11),
      y: z.number().int().min(0),
      w: z.number().int().min(1).max(12),
      h: z.number().int().min(1).max(12),
    })
    .default({ x: 0, y: 0, w: 6, h: 4 }),
});

export const dashboardFilterSchema = z.object({
  field: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["date_range", "select", "multi_select"]),
  options: z.array(z.string()).optional(),
});

export const dashboardInsightSchema = z.object({
  kind: z.enum([
    "growth",
    "decline",
    "trend",
    "anomaly",
    "outlier",
    "concentration",
    "target_gap",
    "top_performer",
    "bottom_performer",
    "observation",
  ]),
  text: z.string().min(1),
  /** Evidence: widget id or query the insight is based on. */
  evidenceWidgetId: z.string().optional(),
});

/**
 * Tema opcional. Sem modelos de cor fechados: quem pede "um painel azul" ou a
 * identidade da própria empresa recebe isso, porque os gráficos leem
 * variáveis CSS em vez de cores fixas.
 */
export const dashboardThemeSchema = z.object({
  colors: z.array(z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)).min(1).max(8),
  surface: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
});

export const dashboardSpecSchema = z.object({
  name: z.string().min(1).max(120),
  purpose: z.string().optional(),
  dialect: z.enum(["bigquery", "postgres", "sqlserver"]),
  dataSourceId: z.string().uuid().optional(),
  filters: z.array(dashboardFilterSchema).default([]),
  widgets: z.array(widgetSchema).min(1).max(24),
  theme: dashboardThemeSchema.optional(),
  insights: z.array(dashboardInsightSchema).default([]),
});

export type DashboardWidget = z.infer<typeof widgetSchema>;
export type DashboardSpec = z.infer<typeof dashboardSpecSchema>;
export type DashboardInsight = z.infer<typeof dashboardInsightSchema>;

/**
 * Visual intelligence rules — documented mapping used in AI prompts and
 * validated here. Kept as data so the prompt and the validator agree.
 */
export const VISUAL_RULES = [
  { goal: "single value / KPI", type: "kpi" },
  { goal: "trend over time", type: "line" },
  { goal: "ranking of categories", type: "horizontal_bar" },
  { goal: "comparison between categories", type: "bar" },
  { goal: "composition over time", type: "stacked_bar" },
  { goal: "cumulative trend", type: "area" },
  { goal: "share of total", type: "horizontal_bar" },
  { goal: "correlation between two measures", type: "scatter" },
  { goal: "detailed records", type: "table" },
  { goal: "top N list with values", type: "ranking" },
  { goal: "matrix of intensity", type: "heatmap" },
  { goal: "stage conversion", type: "funnel" },
  { goal: "value by Brazilian state", type: "map" },
  { goal: "single value against a target", type: "gauge" },
] as const;
