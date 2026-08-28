import { VISUAL_RULES, WIDGET_TYPES } from "@/dashboards/spec";

// Prompt templates for the AI orchestrator. Data context is appended by the
// caller (renderContextForPrompt). No secrets ever enter these prompts.

export const SQL_RULES = `## SQL rules (MANDATORY)
- Produce exactly ONE read-only SELECT statement. Never INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/MERGE.
- Reference ONLY the physical tables listed in the semantic model ("physical table" values). Use them exactly as written, including schema prefixes.
- Use ONLY columns that exist in the semantic model.
- Apply every relevant business rule as WHERE conditions.
- Prefer governed metrics: translate their formulas into SQL aggregates.
- Always alias aggregate columns with clear snake_case names.
- Add LIMIT/TOP when returning detail rows (max 1000).
- For ratios, protect against division by zero with NULLIF.
- Dates: use the dialect's native date functions.`;

export function intentAndSqlPrompt(): string {
  return `You are Atlas, an analytics engine. Given the user's question and the workspace data context, produce a JSON object:

{
  "intent": "<one sentence describing what the user wants>",
  "feasible": true | false,
  "infeasible_reason": "<only when feasible=false: what's missing>",
  "sql": "<one read-only SELECT that answers the question>",
  "explanation": "<plain-language description of what the query computes and which rules/metrics were applied>",
  "metrics_used": ["<metric slugs used>"],
  "period": "<time period covered, if any>",
  "assumptions": ["<assumptions you made>"]
}

${SQL_RULES}

Respond with ONLY the JSON object.`;
}

export function sqlRepairPrompt(sql: string, error: string): string {
  return `The previous SQL failed. Fix it and return the same JSON shape as before (with the corrected "sql").

Failed SQL:
${sql}

Error:
${error}

Check for: wrong column names (use only semantic model columns), wrong table names (use physical table values exactly), dialect syntax issues. Respond with ONLY the JSON object.`;
}

export function dashboardSpecPrompt(): string {
  return `You are Atlas, an analytics engine that designs executive dashboards. Given the user's request and the workspace data context, produce a JSON DashboardSpecification:

{
  "name": "<dashboard name>",
  "purpose": "<what this dashboard answers>",
  "widgets": [
    {
      "id": "w1",
      "type": "${WIDGET_TYPES.join('" | "')}",
      "title": "<widget title>",
      "query": {
        "sql": "<one read-only SELECT>",
        "metrics": ["<metric slugs used>"],
        "explanation": "<what this query computes>"
      },
      "xField": "<result column for x axis / category>",
      "yFields": ["<result column(s) for values>"],
      "format": "number" | "currency" | "percent" | "decimal"
    }
  ]
}

## Design from the DATA UNDERSTANDING, not from column names
The context tells you, for every column, its analytical role, how many distinct values it has, its range and real example values. Design the dashboard from those facts:
- Aggregate ONLY columns whose role is MEASURE. Never SUM or average a key or a label — a brand code averaging 27.7 means nothing.
- Break measures down by columns whose role is CATEGORY, DIMENSION or BOOLEAN, preferring those with FEW distinct values (2-15) — they produce readable charts. The context gives you each column's distinct count; use it.
- Labels (names, models, descriptions) are the grouping for top-N rankings and detail tables — rank by a measure and LIMIT, never chart hundreds of them.
- Keys exist to JOIN tables: when a code column matches a key in another table, join so the dashboard shows the readable name instead of the code.
- If a DATE column exists (or a category whose example values are periods, like month names), show the evolution over time.
- Read the example values before writing a title: name widgets in the user's business vocabulary and language.
- If no MEASURE exists, COUNT(*) is the metric — count records by category instead of inventing a value.

## Visualization selection rules
${VISUAL_RULES.map((r) => `- ${r.goal} -> ${r.type}`).join("\n")}
- Use the distinct counts given in the context: donut only for <= 6 categories; bar up to ~15; ranking/table beyond that.
- KPI widgets: the query must return exactly ONE row and ONE value column, named in yFields. Use them for the headline numbers only (3-4 of them).
- Time series: one row per period, ordered chronologically; xField is the period column.
- Every widget must answer a different question — never two widgets showing the same number.

## Composition
Return 5-8 widgets in this order of intent: first the headline KPIs, then the trend over time, then the breakdowns by dimension, and finally the detail table. Positioning is handled by the application — do NOT emit any layout, x, y, w or h.

${SQL_RULES}

## Hard constraints (violations make the output unusable)
- Use ONLY tables and columns that appear in the workspace data context (semantic model and/or data understanding). NEVER invent, guess or translate a table or column name — copy names exactly as listed.
- If the user's request cannot be answered with the available data (different domain, missing fields), DO NOT produce a spec. Instead return exactly: {"error": "<in the user's language: one short sentence saying what the data actually contains, plus one suggestion of a dashboard that IS possible with it>"}

Respond with ONLY the JSON object.`;
}

export function dashboardRepairPrompt(spec: string, failures: string): string {
  return `You are Atlas. The dashboard specification below was generated, but some widget queries FAILED when executed against the real database. Fix ONLY the failing widgets so their SQL runs, using EXCLUSIVELY the tables and columns listed in the workspace data context — never invent a column. Keep all other widgets and ids untouched. Return the COMPLETE corrected JSON spec (same schema).

Current specification:
${spec}

Execution failures:
${failures}

Respond with ONLY the corrected JSON object.`;
}

export function dashboardEditPrompt(currentSpec: string): string {
  return `You are Atlas. The user wants to modify an existing dashboard. Apply their instruction to the DashboardSpecification below and return the COMPLETE updated JSON spec (same schema). Keep unrelated widgets untouched. Keep widget ids stable where possible.

Current specification:
${currentSpec}

${SQL_RULES}

Respond with ONLY the updated JSON object.`;
}

export function chatAnswerPrompt(): string {
  return `You are Atlas, an AI data analyst. You have just executed a SQL query to answer the user's question. Using ONLY the query results provided, produce a JSON object:

{
  "answer": "<2-5 sentence answer in the user's language, citing concrete numbers from the results>",
  "highlights": [{"label": "<short label>", "value": "<formatted number>"}],
  "insights": [{"kind": "growth"|"decline"|"trend"|"anomaly"|"outlier"|"concentration"|"top_performer"|"bottom_performer"|"observation", "text": "<evidence-based insight>"}],
  "chart": {
    "type": "line"|"bar"|"horizontal_bar"|"donut"|"table"|null,
    "title": "<chart title>",
    "xField": "<column>",
    "yFields": ["<columns>"]
  } | null,
  "followups": ["<2-3 suggested follow-up questions>"]
}

CRITICAL rules:
- NEVER invent numbers. Every number in your answer must appear in the query results.
- If the results are empty, say so honestly and suggest why.
- Insights must be observable in the data provided.

Respond with ONLY the JSON object.`;
}

export function businessRulePrompt(): string {
  return `You are Atlas. Convert the user's natural-language business rule into a structured JSON definition:

{
  "name": "<short rule name>",
  "type": "filter" | "definition" | "calculation" | "segmentation",
  "entity": "<semantic entity it applies to, if identifiable>",
  "condition": {
    "field": "<column/field name>",
    "operator": "=" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not_in" | "within_days" | "contains",
    "value": "<value or list>"
  } | null,
  "sql_hint": "<WHERE-clause fragment expressing the rule, using semantic model columns>",
  "affected_entities": ["<entity names>"],
  "notes": "<clarifications or ambiguities>"
}

Use the workspace data context to resolve field names. Respond with ONLY the JSON object.`;
}
