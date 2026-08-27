# Deployment

## Topology

- **Frontend + API**: Vercel (or any Node 20+ host running `next start`).
  All server code is standard Next.js route handlers/server components — no
  local-only dependencies.
- **Database / Auth / Storage**: Supabase (managed Postgres with RLS,
  GoTrue auth, Storage buckets, pgvector).
- **Workers (future)**: profiling, schema sync, document processing,
  embeddings and large queries are isolated behind service functions and
  can move to a separate worker (e.g. a small Node service consuming a
  queue, or Supabase Edge Functions + pg_cron) without changing callers.

## Steps

1. Create a Supabase project. Apply `supabase/migrations/*.sql` in order
   (`supabase db push` or the SQL editor).
2. In Supabase Auth settings: set the site URL, add
   `https://<host>/auth/callback` to redirect URLs. (Optional: disable
   email confirmation for frictionless onboarding.)
3. Deploy to Vercel with the environment variables from `.env.example`
   (Supabase URL/keys, `ENCRYPTION_KEY`, `LLM_PROVIDER` + API key).
4. Ensure outbound network access from the host to your databases
   (BigQuery is HTTPS; Postgres/SQL Server need reachable hosts — use SSL).

## Notes

- Serverless function duration: profiling/sync of large sources may exceed
  default limits; raise the function timeout or move those routes to a
  worker first.
- `SUPABASE_SERVICE_ROLE_KEY` and `ENCRYPTION_KEY` are server-only; never
  expose them with the `NEXT_PUBLIC_` prefix.
- Observability: `ai_runs` (AI latency/tokens/errors), `query_executions`
  (query latency/status), `audit_logs` and `usage_events` are the built-in
  telemetry tables; ship structured logs to your platform's log drain.
