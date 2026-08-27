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
  "donut",
  "scatter",
  "table",
  "ranking",
  "heatmap",
  "funnel",
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
  type: z.enum(WIDGET_TYPES),
  title: z.string().min(1),
  description: z.string().optional(),
  query: widgetQuerySchema,
  /** Column of the result to use for category/x axis. */
  xField: z.string().optional(),
  /** Columns of the result plotted as series/values. */
  yFields: z.array(z.string()).default([]),
  format: z.enum(["number", "currency", "percent", "decimal"]).optional(),
  /** Grid layout: 12-column grid. */
  layout: z.object({
    x: z.number().int().min(0).max(11),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(12),
  }),
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

export const dashboardSpecSchema = z.object({
  name: z.string().min(1).max(120),
  purpose: z.string().optional(),
  dialect: z.enum(["bigquery", "postgres", "sqlserver"]),
  dataSourceId: z.string().uuid().optional(),
  filters: z.array(dashboardFilterSchema).default([]),
  widgets: z.array(widgetSchema).min(1).max(24),
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
  { goal: "share of total (<= 6 slices)", type: "donut" },
  { goal: "correlation between two measures", type: "scatter" },
  { goal: "detailed records", type: "table" },
  { goal: "top N list with values", type: "ranking" },
  { goal: "matrix of intensity", type: "heatmap" },
  { goal: "stage conversion", type: "funnel" },
] as const;
