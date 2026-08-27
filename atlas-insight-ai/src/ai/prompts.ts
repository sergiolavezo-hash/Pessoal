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
      "format": "number" | "currency" | "percent" | "decimal",
      "layout": {"x": 0, "y": 0, "w": 3, "h": 2}
    }
  ]
}

## Visualization selection rules
${VISUAL_RULES.map((r) => `- ${r.goal} -> ${r.type}`).join("\n")}
- Consider cardinality: donut only for <= 6 categories; bar up to ~15; ranking for top N.
- KPI widgets: the query must return exactly one row; put the value column in yFields.
- Time series: return one row per period, ordered by period; xField is the period column.

## Layout rules
- 12-column grid. KPI row first: 4 KPIs of w=3,h=2 at y=0.
- Charts below: w=6,h=4 side by side, then full-width tables w=12,h=4.
- Ensure widgets do not overlap; increase y for each row.

${SQL_RULES}

## Hard constraints (violations make the output unusable)
- Use ONLY tables and columns that appear in the workspace data context (semantic model and/or Physical schema). NEVER invent, guess or translate a table or column name — copy names exactly as listed.
- If the user's request cannot be answered with the available data (different domain, missing fields), DO NOT produce a spec. Instead return exactly: {"error": "<in the user's language: one short sentence saying what the data actually contains, plus one suggestion of a dashboard that IS possible with it>"}

Create 4-8 widgets that best answer the request. Respond with ONLY the JSON object.`;
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
