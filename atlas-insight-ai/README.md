# Atlas Insight AI

Plataforma SaaS B2B de análise de dados com IA da **Atlas Tecnologia**: conecta fontes de dados
(BigQuery, PostgreSQL, SQL Server, CSV/XLSX), entende o negócio do cliente (perfil, relacionamentos,
camada semântica, métricas certificadas, regras de negócio) e gera dashboards e análises com IA —
sempre em **modo somente leitura** sobre os dados do cliente.

## Stack

- **Next.js 14 (App Router) + TypeScript estrito + Tailwind** — UI no padrão visual Atlas
- **Supabase** — Postgres com RLS multi-tenant, Auth (e-mail/senha) e storage
- **Zod** — validação de entrada e de ambiente
- **Vitest** — testes de unidade
- **Stripe** (FASE 7) — assinatura mensal/anual + transações

## Segurança (decisões estruturais)

- Multi-tenancy `Organization → Workspace → recursos`, com RLS em todas as tabelas e RBAC
  (OWNER/ADMIN/EDITOR/VIEWER) via funções `SECURITY DEFINER`.
- Credenciais de fontes de dados cifradas com **AES-256-GCM** (`src/lib/crypto.ts`); a tabela
  `data_source_credentials` **não tem políticas RLS de cliente** — só o service role acessa.
- Todo SQL executado nas fontes passa pelo **sql-guard** (`src/lib/sql-guard.ts`): allowlist de
  SELECT/WITH, denylist de escrita/DDL/funções perigosas, bloqueio de stacked statements e LIMIT
  imposto.
- Trial gating no banco: `can_run_dashboard()` / `consume_dashboard_run()` — 14 dias **ou**
  1 execução de dashboard, o que terminar primeiro.

## Desenvolvimento

```bash
cp .env.example .env.local   # preencha Supabase + ENCRYPTION_KEY
npm install
npm run dev                  # http://localhost:3000
npm test                     # vitest
npm run build
```

Migrations em `supabase/migrations/` (aplicar em ordem via SQL editor do Supabase ou CLI
`supabase db push`).

## Roadmap (fases)

1. **Fundação** — auth, multi-tenancy, RBAC, billing/trial, shell do app ← _atual_
2. Conectores reais (BigQuery/Postgres/SQL Server/arquivos)
3. Inteligência de dados (profiler, relacionamentos, semântica, métricas, regras)
4. Orquestrador de IA (abstração multi-LLM, geração/validação de SQL)
5. Dashboards (spec versionada, geração por IA, editor)
6. Analista IA (chat analítico auditável)
7. Enterprise & Billing (auditoria, usage, Stripe checkout/webhooks/portal)
