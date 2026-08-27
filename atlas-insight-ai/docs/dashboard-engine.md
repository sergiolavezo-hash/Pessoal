# Dashboard Engine

Dashboards are **spec-driven**: the only artifact is a
`DashboardSpecification` (Zod schema in `src/dashboards/spec.ts`), stored on
`dashboards.spec` and versioned in `dashboard_versions`. The AI edits the
spec — never the DOM — and the frontend never receives an unvalidated spec.

## Specification

```jsonc
{
  "name": "Executive Sales",
  "dialect": "postgres",
  "dataSourceId": "<uuid>",
  "widgets": [{
    "id": "w1", "type": "kpi" | "line" | "bar" | "horizontal_bar" |
      "stacked_bar" | "area" | "donut" | "scatter" | "table" | "ranking" |
      "heatmap" | "funnel",
    "title": "Revenue",
    "query": { "sql": "SELECT ...", "metrics": ["revenue"], "explanation": "..." },
    "xField": "month", "yFields": ["revenue"], "format": "currency",
    "layout": { "x": 0, "y": 0, "w": 3, "h": 2 }   // 12-column grid
  }],
  "insights": [{ "kind": "growth", "text": "...", "evidenceWidgetId": "w1" }]
}
```

Every widget SQL is re-validated read-only on generation, on manual PATCH
and again before each execution.

## Visual intelligence

The chart-type rules live as data (`VISUAL_RULES`) shared by the prompt and
docs: trend→line, ranking→horizontal bar, KPI→kpi card, comparison→bar,
composition→stacked bar, distribution→histogram-style bar, correlation→
scatter, stage conversion→funnel. Cardinality guidance (donut ≤ 6 slices,
ranking top N) is enforced in the prompt and by renderer slicing.

## Rendering

`ChartRenderer` (Recharts) is theme-aware (CSS variables), uses a fixed
5-slot validated categorical palette (never cycled), thin marks, rounded
data ends, tooltips everywhere, legends for multi-series, and a table
fallback. Widget data is fetched from `POST /api/dashboards/:id/data`, which
executes the stored queries per widget and returns rows + execution ids.

## Editing

- Widget menu: explain (SQL + metrics + execution id), fullscreen,
  duplicate, delete (spec PATCH with validation + version bump).
- "Ask Atlas to change this dashboard…": `POST /api/dashboards/:id/edit`
  runs the orchestrator's edit flow over the current spec and stores the
  validated result as a new version.
- Status lifecycle: DRAFT → PUBLISHED → ARCHIVED; history in
  `dashboard_versions` with change summaries.
