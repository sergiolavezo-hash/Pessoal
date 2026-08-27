# Database

All schema lives in `supabase/migrations`, applied in order.

## Migrations

| File | Contents |
|---|---|
| `0001_foundation.sql` | Extensions, `app` helper schema, profiles (+auth trigger), organizations, members (RBAC enum), workspaces, role helper functions, `bootstrap_organization()` RPC, RLS. |
| `0002_data_catalog.sql` | `app.apply_workspace_policies()` generator, data_sources, data_source_credentials (service-role only), datasets, catalog_tables, catalog_columns (profile + classification jsonb), catalog_relationships, workspace_files, file_table_rows. |
| `0003_semantic_metrics_rules.sql` | semantic_models (versioned), semantic_entities/fields, metrics + metric_dependencies, business_rules, glossary_terms, business_documents + document_chunks (pgvector, RAG-ready). |
| `0004_dashboards_ai_audit.sql` | dashboards (+ dashboard_versions), query_executions, ai_conversations/messages/runs, audit_logs, subscriptions, usage_events. |
| `0005_storage.sql` | `workspace-files` bucket + path-prefix policies (`<workspace_id>/...`). |
| `0006_file_query_engine.sql` | `file_data` schema, `atlas_file_reader` SELECT-only role, RPCs: create/insert/drop file tables, `run_file_query` (read-only, timeout, row cap), introspection. Service-role execute only. |

## Conventions

- UUID PKs (`gen_random_uuid()`), `created_at`/`updated_at` timestamps with
  an `app.set_updated_at()` trigger, soft delete (`deleted_at`) on
  user-facing resources (data_sources, dashboards, metrics, organizations,
  workspaces).
- Every workspace-scoped table has `workspace_id` FK + index where needed.
- RBAC: `app.org_role` enum `OWNER > ADMIN > EDITOR > VIEWER`;
  `app.has_org_role/has_workspace_role` are SECURITY DEFINER to avoid RLS
  recursion.
- `data_source_credentials` has RLS enabled with **no policies** — only the
  service role can touch it. Payloads are AES-256-GCM encrypted (see
  `security.md`).

## Applying migrations

With the Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

or paste each file into the SQL editor in order.
