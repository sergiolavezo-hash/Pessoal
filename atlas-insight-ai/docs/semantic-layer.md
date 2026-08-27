# Semantic Layer

The semantic model is the contract between raw data and everything above it
(metrics, AI, dashboards). The LLM never works from bare column lists — it
receives entities, dimensions, measures and relationships with physical
table lineage.

## Schema (`src/semantic/schema.ts`, Zod-validated)

```jsonc
{
  "name": "Sales model",
  "dialect": "postgres",
  "entities": [
    {
      "name": "Sales",
      "table": "public.sales",          // exact physical reference for SQL
      "tableId": "<catalog uuid>",       // lineage
      "primaryKey": "order_id",
      "fields": [
        { "name": "Revenue", "column": "revenue", "fieldType": "MEASURE",
          "defaultAggregation": "SUM", "format": "currency", "confidence": 0.95 },
        { "name": "Region", "column": "region", "fieldType": "DIMENSION",
          "synonyms": ["território"] }
      ]
    }
  ],
  "relationships": [
    { "fromEntity": "Sales", "fromField": "customer_id",
      "toEntity": "Customers", "toField": "customer_id",
      "type": "many-to-one", "confidence": 0.95 }
  ]
}
```

## Generation

`generateSemanticModel()` (`src/semantic/generator.ts`) builds a draft from
the profiled catalog: entity per table, field types from column
classifications (with confidence), relationships from detected FK→PK pairs.

## Versioning

Each generation creates a new `semantic_models` row with `version = n+1`;
the previous ACTIVE model is ARCHIVED (rollback = re-activating an archived
version). `context_version` on `ai_runs` records which model version each AI
execution used.

## Profiling & classification

`src/data-profiler/profiler.ts` computes per-column stats (row/unique
counts, cardinality, null %, min/max/avg, samples) and classifies columns as
`ID / FOREIGN_KEY / DIMENSION / MEASURE / DATE / TEXT / BOOLEAN / CATEGORY`
— every inference carries `confidence` (0–1) and is stored on
`catalog_columns.classification`. Relationship detection
(`relationships.ts`) matches FK naming patterns + type compatibility +
cardinality and stores `relationship_type`, `confidence`, `reason`,
`source='inferred'` — inferences are suggestions, not facts.
