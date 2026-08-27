# API

All routes: JSON in/out, Zod-validated input, authenticated via the Supabase
session cookie, authorized via `requireWorkspace(workspaceId, minRole)`.
Errors: `{ "error": string }` with proper status codes (400/401/403/404/
422/500). Mutations write `audit_logs`.

## Data sources

| Method & path | Role | Purpose |
|---|---|---|
| `GET /api/data-sources?workspaceId=` | VIEWER | List sources |
| `POST /api/data-sources` | EDITOR | Create (validates config/credentials per type, tests connection, encrypts secrets) |
| `GET /api/data-sources/:id?workspaceId=` | VIEWER | Detail |
| `PATCH /api/data-sources/:id` | EDITOR | Update name/config |
| `DELETE /api/data-sources/:id?workspaceId=` | EDITOR | Soft delete |
| `POST /api/data-sources/:id/test` | VIEWER | Test connection |
| `POST /api/data-sources/:id/sync` | EDITOR | Discover schemas/tables/columns into the catalog |
| `GET /api/data-sources/:id/schemas?workspaceId=` | VIEWER | Live schema list |
| `GET /api/data-sources/:id/tables?workspaceId=&schema=` | VIEWER | Live table list |

## Files

| `GET /api/files?workspaceId=` | VIEWER | List uploads |
| `POST /api/files` (multipart) | EDITOR | Upload CSV/XLSX → parse, infer types, materialize + catalog |

## Profiling & semantic layer

| `POST /api/profiling/:dataSourceId` | EDITOR | Profile all tables + detect relationships |
| `GET /api/semantic-models?workspaceId=` | VIEWER | List models |
| `POST /api/semantic-models` | EDITOR | Generate model from the profiled catalog (new version) |

## Metrics & rules

| `GET /api/metrics?workspaceId=` | VIEWER | List |
| `POST /api/metrics` | EDITOR | Create (+auto-validate) |
| `PATCH /api/metrics/:id` | EDITOR (certify: ADMIN) | Update / certify / status |
| `DELETE /api/metrics/:id?workspaceId=` | EDITOR | Soft delete |
| `POST /api/metrics/validate` | VIEWER | Live formula validation |
| `GET /api/business-rules?workspaceId=` | VIEWER | List |
| `POST /api/business-rules` | EDITOR | Create (AI structures the rule) |
| `PATCH /api/business-rules/:id` · `DELETE …` | EDITOR | Update/delete |

## AI & queries

| `POST /api/ai/analyze` | EDITOR | One-shot: intent → SQL → execute → evidence |
| `POST /api/ai/chat` | EDITOR | Conversational turn (persists messages + evidence) |
| `POST /api/query/execute` | EDITOR | Direct read-only SQL (validated, capped, recorded) |

## Dashboards

| `POST /api/dashboards/generate` | EDITOR | NL → validated spec → stored dashboard |
| `GET /api/dashboards/:id?workspaceId=` | VIEWER | Fetch |
| `PATCH /api/dashboards/:id` | EDITOR | Rename/status/spec (full re-validation, new version) |
| `DELETE /api/dashboards/:id?workspaceId=` | EDITOR | Soft delete |
| `POST /api/dashboards/:id/data` | VIEWER | Execute stored widget queries |
| `POST /api/dashboards/:id/edit` | EDITOR | AI edit of the spec (new version) |
