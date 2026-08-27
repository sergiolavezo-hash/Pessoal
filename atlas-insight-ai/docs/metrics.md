# Metrics Engine

Metrics are governed, reusable calculations defined in a small, safe formula
language (`src/metrics/formula.ts`):

```
Revenue        SUM(Sales.revenue)
Orders         COUNT_DISTINCT(Sales.order_id)
Gross Profit   metric(revenue) - metric(cost)
Gross Margin   metric(gross_profit) / metric(revenue)
Average Ticket metric(revenue) / metric(orders)
```

Grammar: aggregations (`SUM/AVG/MIN/MAX/COUNT/COUNT_DISTINCT` over
`Entity.field`, `COUNT(Entity)` for row counts), `metric(slug)` references,
arithmetic (`+ - * /`, parentheses), numeric literals. Unicode identifiers
are supported (pt-BR synonyms resolve through the semantic model).

## Lifecycle

`DRAFT → VALIDATED → ACTIVE → DEPRECATED`. Validation
(`src/metrics/engine.ts`) resolves every `Entity.field` against the active
semantic model (including synonyms), every `metric()` against existing
metrics, and rejects self-references and circular dependency chains.
Editing a formula bumps `version`.

## Certification

ADMIN/OWNER can certify a metric (`certified = true`). Certified metrics are
listed first in the AI context and the prompt instructs the model to prefer
them over ad-hoc calculations.

## Compilation

`compileMetricToSql()` turns a formula into a dialect-quoted SQL aggregate
expression, inlining `metric()` references recursively (depth-capped) and
protecting divisions with `NULLIF(x, 0)`.

## Explain

The metric detail page shows definition, formula, source fields, metric
dependencies and which business rules affect it (`affected_metrics`).
