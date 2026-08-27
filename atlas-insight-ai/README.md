# Atlas Insight AI

> **Your data. Your rules. Your intelligence.**

Atlas Insight AI is a multi-tenant B2B analytics SaaS that connects to your
data sources, profiles and understands your data, learns your business
rules, builds a governed semantic layer and metrics catalog, generates
interactive dashboards, and lets you talk to your data in natural language —
with **every number backed by a real, validated, recorded query**.

```
USER → LOGIN → WORKSPACE → CONNECT DATA → DISCOVERY → PROFILING →
RELATIONSHIPS → SEMANTIC MODEL → BUSINESS RULES → METRICS →
PROMPT → AI ANALYSIS → SQL (validated, read-only) → EXECUTION →
DASHBOARD SPEC → DASHBOARD → AI ANALYST → INSIGHTS (with evidence)
```

## Features

- **Multi-tenant** from day one: Organizations → Workspaces → Resources,
  Postgres RLS on every table, org-level RBAC (OWNER/ADMIN/EDITOR/VIEWER).
- **Real connectors**: PostgreSQL, SQL Server, BigQuery, CSV/XLSX uploads
  (materialized as genuine SQL-queryable tables). One `DataConnector`
  interface; adapters are pluggable (Snowflake/Redshift/Databricks slots
  ready).
- **Data intelligence**: automatic profiling (stats + column classification
  with confidence), FK→PK relationship detection, versioned semantic models.
- **Metrics engine**: a safe formula language (`SUM(Sales.revenue)`,
  `metric(revenue) - metric(cost)`), validation against the semantic model,
  circular-dependency detection, certification workflow.
- **Business rules** in plain language, structured by AI and applied to
  every relevant analysis.
- **AI orchestration**: provider-neutral LLM abstraction (Claude by
  default; OpenAI/Gemini adapters), structured context (certified metrics →
  rules → semantic model → glossary), SQL generation with AST-based
  read-only validation, bounded error-recovery, full run tracking.
- **Spec-driven dashboards**: the AI produces a Zod-validated
  `DashboardSpecification`; 12 chart types rendered with a CVD-validated
  palette; "Ask Atlas" edits the spec, never the DOM; versioned history.
- **AI Analyst**: conversational analytics where every answer shows its
  evidence — intent, metrics used, SQL, execution id, result sample.
- **Governance & telemetry**: audit logs, AI run tracking, query execution
  records, usage events, billing-ready plan tables.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
shadcn-style design system (Radix primitives) · Supabase (PostgreSQL, Auth,
Storage, RLS, pgvector) · Zod · React Hook Form · Recharts ·
node-sql-parser · Vitest · Playwright.

## Getting started

### Requirements

- Node.js 20+
- A Supabase project (free tier works)
- An LLM API key (Anthropic, OpenAI or Google) for the AI features

### 1. Install

```bash
npm install
```

### 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migrations in order — with the CLI:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
   or paste each file from `supabase/migrations/` into the SQL editor
   (0001 → 0006).
3. In **Auth → URL Configuration** set your site URL and add
   `http://localhost:3000/auth/callback` to the redirect list. Optionally
   disable "Confirm email" for a faster first-run experience.

### 3. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; credentials + file engine |
| `ENCRYPTION_KEY` | 32+ chars (`openssl rand -base64 32`) — encrypts data source credentials at rest |
| `LLM_PROVIDER` | `anthropic` (default) \| `openai` \| `google` |
| `ANTHROPIC_API_KEY` (or the provider's key) | AI features |
| `QUERY_TIMEOUT_MS` / `QUERY_MAX_ROWS` | Query engine limits (defaults: 30000 / 10000) |

### 4. Run

```bash
npm run dev        # http://localhost:3000
```

First run: **Sign up → create your organization/workspace → connect a data
source (or upload a CSV) → Sync schema → Profile data → Generate semantic
model → create metrics/rules → Generate a dashboard or ask the AI Analyst.**

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest unit tests (SQL validator, metrics engine, profiler, spec, ingestion, crypto) |
| `npm run test:e2e` | Playwright E2E (smoke tests run anywhere; full flows need `E2E_SUPABASE=1` + a configured project) |

## Documentation

| Doc | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Module map, request flows, tenancy |
| [docs/database.md](docs/database.md) | Migrations, conventions, RLS |
| [docs/connectors.md](docs/connectors.md) | Connector interface, adapters, file engine |
| [docs/semantic-layer.md](docs/semantic-layer.md) | Model schema, profiling, versioning |
| [docs/metrics.md](docs/metrics.md) | Formula language, validation, certification |
| [docs/ai.md](docs/ai.md) | LLM abstraction, orchestrator, SQL safety |
| [docs/dashboard-engine.md](docs/dashboard-engine.md) | Spec schema, visual rules, rendering |
| [docs/security.md](docs/security.md) | Isolation, RBAC, credentials, query safety |
| [docs/api.md](docs/api.md) | Endpoint reference |
| [docs/deployment.md](docs/deployment.md) | Vercel + Supabase deployment |

## Security posture (summary)

Read-only SQL everywhere (AST validation + engine-level read-only sessions +
timeouts + row caps), RLS-enforced tenant isolation, RBAC checked in the
database and the API, AES-256-GCM credential encryption in a service-role-
only table, no secrets in prompts or the client, audit logs on every
mutation. Details in [docs/security.md](docs/security.md).

## Roadmap

- **Next**: Snowflake / Redshift / Databricks / REST connectors, document
  RAG over `document_chunks` (schema ready), dashboard sharing & export,
  schema drift alerts, drag-and-drop layout editing.
- **Enterprise**: SSO, advanced RBAC, embedded analytics, white label,
  public API, private deployment.
