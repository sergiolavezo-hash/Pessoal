# AI

## LLM abstraction

`src/ai/llm/types.ts` defines `LLMProvider` — the only surface the app
depends on. Adapters: `AnthropicProvider` (official SDK, default model
`claude-opus-5`), `OpenAIProvider`, `GoogleProvider`. Selection is
environment-driven (`LLM_PROVIDER` + the matching API key); swapping
providers requires no code changes.

## Orchestrator (`src/ai/orchestrator.ts`)

Responsibilities: intent detection, semantic/business-rule/metric
resolution (via structured context), SQL generation, validation, execution,
bounded recovery, result interpretation, visualization selection and
dashboard specification — each step auditable.

### Context priority (spec §32)

1. Certified metrics (listed first, and the prompt says to prefer them)
2. Business rules (must be applied as filters)
3. Semantic model (entities, physical tables, fields, relationships)
4. Data profile (via field metadata)
5. Documents (RAG pipeline — schema ready in `document_chunks`)
6. Raw schema

Credentials, keys and secrets never enter prompts.

### Recovery loop

SQL that fails validation or execution is fed back to the LLM with the
error (`sqlRepairPrompt`) for up to 3 total attempts — never an infinite
loop. Blocked/failed attempts are still recorded in `query_executions`.

### No hallucination

Quantitative answers must come from executed queries. The interpretation
prompt receives only the actual result rows; the UI shows the evidence:
SQL, execution id, row count, metrics used, period, assumptions. Insight
kinds are a closed taxonomy (growth, decline, trend, anomaly, outlier,
concentration, target_gap, top/bottom performer, observation) and each is
tied to observed data.

## Run tracking

Every LLM call inserts an `ai_runs` row: workspace, user, provider, model,
prompt hash (never the raw prompt), context version, status, token counts,
timing and the linked `query_execution_id`. `usage_events` records
`ai_request` events for metering.

## SQL validation (`src/ai/query-engine/sql-validator.ts`)

- AST parse via node-sql-parser (dialect-aware) — only SELECT statements.
- Literal/comment stripping + forbidden-keyword scan as a fallback for
  dialect corners the parser misses.
- Blocks: INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/MERGE/GRANT/…,
  multiple statements, SELECT … FOR UPDATE, INTO OUTFILE, pg_sleep,
  WAITFOR DELAY, xp_cmdshell, dblink, filesystem functions.
- Extracts referenced tables and enforces the semantic-model allowlist.
