# Arquitetura — Atlas Insight AI

## Visão geral

```
Navegador ──► Next.js (Vercel) ──► Supabase (Auth + Postgres/RLS)
                    │
                    ├─► Conectores (somente leitura) ──► BigQuery / Postgres / SQL Server / arquivos
                    ├─► Orquestrador de IA ──► Anthropic (padrão) / OpenAI / Google
                    └─► Stripe (assinaturas + webhooks)          [FASE 7]
```

- **Marketing** vive em `atlas-partner.com` (site estático). O app roda em
  `app.atlas-partner.com` (Vercel) — o item "Insight AI" do menu do site leva à landing
  `insight.html`, que aponta para o app.
- O app é `robots: noindex`; só a landing é indexável.

## Multi-tenancy e RBAC

`Organization → Workspace → recursos` (fontes, datasets, métricas, dashboards…).

- Toda tabela tem RLS; o acesso é decidido por funções `SECURITY DEFINER`
  (`is_org_member`, `has_org_role`, `is_ws_member`, `ws_has_role`) para evitar recursão de policy.
- Papéis: `OWNER > ADMIN > EDITOR > VIEWER`. Leitura = membro; escrita = EDITOR+;
  exclusão/gestão = ADMIN+; billing = ADMIN+.
- `create_organization()` (RPC) cria org + membership OWNER + workspace inicial + auditoria em uma
  transação; um trigger cria a assinatura trial automaticamente.

## Camadas de segurança de dados

1. **Credenciais**: cifradas no app com AES-256-GCM (`ENCRYPTION_KEY` fora do banco) e gravadas em
   `data_source_credentials`, tabela **sem policies de cliente** — apenas service role.
2. **sql-guard**: normaliza (remove comentários/literais), bloqueia stacked statements, permite só
   `SELECT`/`WITH`/`EXPLAIN SELECT`, nega palavras de escrita/DDL e funções perigosas
   (`pg_sleep`, `dblink`, `xp_cmdshell`…), impõe `LIMIT`.
3. **Conectores** (`src/connectors`): contrato único `DataConnector`; implementações chamam o guard
   de novo antes do driver (defesa em profundidade). Registro por `kind` em `registry.ts`.
4. **Auditoria**: `audit_logs` + `query_executions` + `ai_runs` registram quem fez o quê.

## Billing e trial

- `billing_plans` (catálogo), `subscriptions` (1:1 com organização), `payment_transactions`
  (histórico imutável), `usage_events` (medição).
- Trial: `TRIALING` com `trial_ends_at` (14 dias) **e** `trial_dashboard_runs_limit` (1).
  `can_run_dashboard()` responde `{allowed, reason}`; `consume_dashboard_run()` consome de forma
  atômica e registra o uso. Expirou tempo **ou** esgotou execuções ⇒ bloqueia até assinar.
- Stripe entra na FASE 7: checkout (mensal/anual), webhooks atualizando `subscriptions` +
  `payment_transactions` via service role, e portal do cliente.

## Ambiente

`src/lib/env.ts` valida com Zod em acesso preguiçoso: o build não exige segredos; runtime falha
com mensagem clara. Cliente browser usa apenas `NEXT_PUBLIC_*`.

## Autenticação

`@supabase/ssr` com cookies: middleware (`middleware.ts` → `updateSession`) renova sessão e faz o
gate de rotas (públicas: login/signup/forgot/reset/callback). O layout `(app)` revalida o usuário
no servidor e redireciona para `/onboarding` quando não há organização.

## Fases seguintes

| Fase | Entrega | Observações |
| --- | --- | --- |
| 2 | Conectores reais | drivers BigQuery/pg/mssql + parser CSV/XLSX; teste de conexão; sync de metadados |
| 3 | Inteligência | profiler, detecção de relacionamentos com confiança, semântica versionada, métricas, regras |
| 4 | IA | abstração multi-LLM (padrão Anthropic), geração de SQL validada pelo guard, custos em `ai_runs` |
| 5 | Dashboards | `DashboardSpec` versionada, geração por IA, editor, execução via `consume_dashboard_run` |
| 6 | Analista IA | chat com contexto semântico, análises auditáveis |
| 7 | Enterprise | convites/membros, auditoria visível, usage, Stripe end-to-end |
