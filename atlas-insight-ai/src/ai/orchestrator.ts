import "server-only";
import { z } from "zod";
import { sha256 } from "@/lib/crypto";
import { getLLMProvider } from "@/ai/llm";
import { extractJson, type LLMProvider } from "@/ai/llm/types";
import { buildWorkspaceContext, renderContextForPrompt, type WorkspaceAiContext } from "@/ai/context";
import {
  businessRulePrompt,
  chatAnswerPrompt,
  dashboardEditPrompt,
  dashboardRepairPrompt,
  dashboardSpecPrompt,
  intentAndSqlPrompt,
  sqlRepairPrompt,
} from "@/ai/prompts";
import { validateReadOnlySql } from "@/ai/query-engine/sql-validator";
import { executeQuery, type ExecutionRecord } from "@/services/query-engine";
import { dashboardSpecSchema, type DashboardSpec } from "@/dashboards/spec";
import { applyDashboardLayout, repairWidgetVisual } from "@/dashboards/layout";
import type { ApiContext } from "@/services/api-context";
import { ApiError } from "@/services/api-context";
import { priceRun } from "@/services/ai-cost";
import { assertHasCredits, chargeAiUsage, getCreditStatus } from "@/services/ai-credits";

const MAX_SQL_ATTEMPTS = 3;

/**
 * Teto de linhas do ensaio dos widgets: suficiente para saber o formato do
 * resultado (e escolher o gráfico certo) sem custo de uma execução completa.
 */
const DRY_RUN_MAX_ROWS = 200;

/**
 * Alguns modelos (ex.: Gemini) devolvem null em campos opcionais; o Zod
 * espera undefined. Remove nulls recursivamente antes de validar.
 */
function stripNulls<T>(value: T): T {
  if (value === null || value === undefined) return undefined as T;
  return JSON.parse(JSON.stringify(value), (_key, v) => (v === null ? undefined : v)) as T;
}


const sqlAnswerSchema = z.object({
  intent: z.string().default(""),
  feasible: z.boolean().default(true),
  infeasible_reason: z.string().optional(),
  sql: z.string().default(""),
  explanation: z.string().default(""),
  metrics_used: z.array(z.string()).default([]),
  period: z.string().optional(),
  assumptions: z.array(z.string()).default([]),
});

export type SqlAnswer = z.infer<typeof sqlAnswerSchema>;

const chatAnswerSchema = z.object({
  answer: z.string(),
  highlights: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  insights: z
    .array(z.object({ kind: z.string(), text: z.string() }))
    .default([]),
  chart: z
    .object({
      type: z.enum(["line", "bar", "horizontal_bar", "donut", "table"]).nullable(),
      title: z.string().optional(),
      xField: z.string().optional(),
      yFields: z.array(z.string()).default([]),
    })
    .nullable()
    .default(null),
  followups: z.array(z.string()).default([]),
});

export type ChatAnswer = z.infer<typeof chatAnswerSchema>;

const dashboardPromptSuggestionSchema = z.object({
  title: z.string().max(80).default(""),
  prompt: z.string().min(10).max(2000),
  alternatives: z.array(z.string().max(160)).max(4).default([]),
  dataSummary: z.string().max(300).default(""),
});

export type DashboardPromptSuggestion = z.infer<typeof dashboardPromptSuggestionSchema>;

type RunKind =
  | "analyze"
  | "chat"
  | "dashboard_generate"
  | "dashboard_edit"
  | "business_rule_parse"
  | "insight"
  | "sql_generate"
  | "document_extract";

/**
 * AIOrchestrator: intent detection -> semantic/business-rule/metric
 * resolution (via structured context) -> SQL generation -> validation ->
 * execution -> recovery -> interpretation. Every LLM call is tracked in
 * ai_runs; every query in query_executions.
 */
export class AIOrchestrator {
  private provider: LLMProvider;

  constructor(
    private readonly ctx: ApiContext,
    private readonly conversationId?: string
  ) {
    this.provider = getLLMProvider();
  }

  private async trackRun<T>(
    kind: RunKind,
    prompt: string,
    contextVersion: string,
    fn: () => Promise<{
      value: T;
      inputTokens: number;
      outputTokens: number;
      queryExecutionId?: string;
      /** Modelo que realmente respondeu; a cadeia de fallback pode trocá-lo. */
      model?: string;
    }>
  ): Promise<T> {
    // Portão único de consumo: nenhuma operação de IA começa sem crédito.
    assertHasCredits(await getCreditStatus(this.ctx.supabase, this.ctx.organizationId));

    const { data: run } = await this.ctx.supabase
      .from("ai_runs")
      .insert({
        workspace_id: this.ctx.workspaceId,
        user_id: this.ctx.user.id,
        conversation_id: this.conversationId ?? null,
        kind,
        provider: this.provider.name,
        model: this.provider.model,
        prompt_hash: sha256(prompt),
        context_version: contextVersion,
        status: "RUNNING",
      })
      .select("id")
      .single();

    try {
      const { value, inputTokens, outputTokens, queryExecutionId, model } = await fn();
      // Cobra pelo modelo que ATENDEU, não pelo configurado: a cadeia de
      // fallback pode ter trocado de fornecedor, com preço bem diferente.
      const servedModel = model ?? this.provider.model;
      const cost = priceRun(servedModel, inputTokens, outputTokens);
      await chargeAiUsage(
        this.ctx.supabase,
        this.ctx.organizationId,
        cost.chargedCents,
        run?.id,
        kind
      );
      if (run) {
        await this.ctx.supabase
          .from("ai_runs")
          .update({
            status: "SUCCEEDED",
            model: servedModel,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            provider_cost_usd: cost.providerCostUsd,
            charged_cents: cost.chargedCents,
            completed_at: new Date().toISOString(),
            query_execution_id: queryExecutionId ?? null,
          })
          .eq("id", run.id);
        await this.ctx.supabase.from("usage_events").insert({
          organization_id: this.ctx.organizationId,
          workspace_id: this.ctx.workspaceId,
          user_id: this.ctx.user.id,
          event_type: "ai_request",
          quantity: 1,
          metadata: { kind, tokens: inputTokens + outputTokens },
        });
      }
      return value;
    } catch (error) {
      if (run) {
        await this.ctx.supabase
          .from("ai_runs")
          .update({
            status: "FAILED",
            error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
            completed_at: new Date().toISOString(),
          })
          .eq("id", run.id);
      }
      throw error;
    }
  }

  /**
   * Generates SQL for a question, validates it, executes it, and recovers
   * from execution errors (bounded retries with error feedback).
   */
  async answerWithData(
    question: string,
    preferredDataSourceId?: string,
    analysisContext?: string
  ): Promise<{ sqlAnswer: SqlAnswer; execution: ExecutionRecord; context: WorkspaceAiContext }> {
    const context = await buildWorkspaceContext(this.ctx, preferredDataSourceId, analysisContext);
    if (!context.dataSourceId || (!context.semanticModel && context.rawSchema.length === 0)) {
      throw new ApiError(
        422,
        "No synced data yet. Connect a data source and run Sync schema first."
      );
    }
    const dataSourceId = context.dataSourceId;
    const system = `${intentAndSqlPrompt()}\n\n# Workspace data context\n${renderContextForPrompt(context)}`;

    return this.trackRun("sql_generate", system + question, context.contextVersion, async () => {
      let totalIn = 0;
      let totalOut = 0;
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [
        { role: "user", content: question },
      ];

      let lastError = "";
      for (let attempt = 1; attempt <= MAX_SQL_ATTEMPTS; attempt++) {
        const response = await this.provider.complete({ system, messages, jsonMode: true, maxTokens: 4000 });
        totalIn += response.inputTokens;
        totalOut += response.outputTokens;

        const parsed = sqlAnswerSchema.parse(stripNulls(extractJson(response.text)));
        if (!parsed.feasible) {
          throw new ApiError(422, parsed.infeasible_reason || "The question cannot be answered with the available data.");
        }

        const validation = validateReadOnlySql(parsed.sql, context.dialect ?? "postgres");
        if (!validation.valid) {
          lastError = validation.errors.join("; ");
        } else {
          try {
            const execution = await executeQuery(this.ctx, dataSourceId, parsed.sql, {
              context: {
                question,
                intent: parsed.intent,
                metrics: parsed.metrics_used,
                period: parsed.period,
                explanation: parsed.explanation,
              },
              allowedTables: context.allowedTables,
            });
            return {
              value: { sqlAnswer: parsed, execution, context },
              inputTokens: totalIn,
              outputTokens: totalOut,
              queryExecutionId: execution.executionId,
              model: response.model,
            };
          } catch (error) {
            lastError = error instanceof Error ? error.message : "Execution failed";
          }
        }

        // Feed the failure back for repair (bounded).
        messages.push({ role: "assistant", content: response.text });
        messages.push({ role: "user", content: sqlRepairPrompt(parsed.sql, lastError) });
      }

      throw new ApiError(422, `Could not produce a working query after ${MAX_SQL_ATTEMPTS} attempts: ${lastError}`);
    });
  }

  /** Full AI Analyst turn: SQL -> execute -> interpret with evidence. */
  async chat(question: string, preferredDataSourceId?: string, analysisContext?: string) {
    const { sqlAnswer, execution, context } = await this.answerWithData(
      question,
      preferredDataSourceId,
      analysisContext
    );

    const system = chatAnswerPrompt();
    const resultSample = JSON.stringify(execution.result.rows.slice(0, 50));
    const prompt = `Question: ${question}

Query executed:
${execution.sql}

Query explanation: ${sqlAnswer.explanation}

Results (${execution.result.rowCount} rows${execution.result.truncated ? ", truncated" : ""}):
${resultSample}`;

    const answer = await this.trackRun("chat", system + prompt, context.contextVersion, async () => {
      const response = await this.provider.complete({
        system,
        messages: [{ role: "user", content: prompt }],
        jsonMode: true,
        maxTokens: 3000,
      });
      return {
        value: chatAnswerSchema.parse(stripNulls(extractJson(response.text))),
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        queryExecutionId: execution.executionId,
        model: response.model,
      };
    });

    return {
      answer,
      evidence: {
        sql: execution.sql,
        executionId: execution.executionId,
        rowCount: execution.result.rowCount,
        rows: execution.result.rows.slice(0, 100),
        columns: execution.result.columns,
        metrics: sqlAnswer.metrics_used,
        period: sqlAnswer.period ?? null,
        explanation: sqlAnswer.explanation,
        intent: sqlAnswer.intent,
        assumptions: sqlAnswer.assumptions,
      },
    };
  }

  /**
   * Lê o que existe nos dados selecionados e escreve um prompt detalhado,
   * pronto para uso, do painel que faz sentido construir com eles. O usuário
   * não precisa saber descrever um dashboard — ele edita a sugestão.
   */
  async suggestDashboardPrompt(
    preferredDataSourceId: string,
    analysisContext?: string
  ): Promise<DashboardPromptSuggestion> {
    const context = await buildWorkspaceContext(this.ctx, preferredDataSourceId, analysisContext);
    if (!context.semanticModel && context.rawSchema.length === 0) {
      throw new ApiError(422, "This data source has no synced schema yet.");
    }

    const system = `Você é um analista de BI sênior que ajuda um empresário — não um desenvolvedor — a pedir o painel certo.

Você recebe o esquema real dos dados. Escreva, em português do Brasil, um PROMPT pronto para o usuário enviar, descrevendo o painel mais útil que dá para construir COM ESSAS COLUNAS.

Responda SOMENTE com JSON:
{
  "title": "nome curto do painel (máx. 60 caracteres)",
  "prompt": "prompt detalhado em 1º pessoa ('Quero um painel...'), citando os indicadores, as quebras (por categoria, por mês...) e os gráficos desejados, usando os nomes de negócio das colunas que existem",
  "alternatives": ["outro ângulo de análise", "mais um ângulo", "mais um"],
  "dataSummary": "1 frase dizendo o que esses dados representam"
}

Regras:
- Use APENAS colunas que existem no esquema. Nunca invente campos.
- O prompt deve ter de 3 a 6 linhas: indicadores principais, quebras e gráficos.
- Se houver uma coluna de período (mês, data), inclua a evolução no tempo.
- As alternativas são frases curtas (máx. 90 caracteres), cada uma um recorte diferente.
- Linguagem de negócio, sem jargão técnico e sem SQL.`;

    const prompt = `Esquema disponível${analysisContext ? ` (assunto: ${analysisContext})` : ""}:\n${renderContextForPrompt(context)}`;

    // A sugestão depende só do esquema, e o seletor da tela a pede a cada
    // troca. Reaproveitar a última resposta para o mesmo contexto evita
    // pagar tokens repetidamente pela mesma pergunta.
    const cacheKey = sha256(`suggest:${context.contextVersion}:${prompt}`);
    const cached = await this.readCachedSuggestion(cacheKey);
    if (cached) return cached;

    return this.trackRun("insight", system + prompt, context.contextVersion, async () => {
      const response = await this.provider.complete({
        system,
        messages: [{ role: "user", content: prompt }],
        jsonMode: true,
        maxTokens: 1500,
      });
      const suggestion = dashboardPromptSuggestionSchema.parse(
        stripNulls(extractJson(response.text))
      );
      await this.writeCachedSuggestion(cacheKey, suggestion);
      return {
        value: suggestion,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        model: response.model,
      };
    });
  }

  /**
   * Cache das sugestões, guardado em ai_runs (result_cache) por hash do
   * contexto. Sem tabela nova: a mesma pergunta sobre o mesmo esquema é
   * respondida de graça.
   */
  private async readCachedSuggestion(
    key: string
  ): Promise<DashboardPromptSuggestion | null> {
    const { data } = await this.ctx.supabase
      .from("ai_suggestion_cache")
      .select("payload")
      .eq("workspace_id", this.ctx.workspaceId)
      .eq("cache_key", key)
      .maybeSingle();
    if (!data?.payload) return null;
    const parsed = dashboardPromptSuggestionSchema.safeParse(data.payload);
    return parsed.success ? parsed.data : null;
  }

  private async writeCachedSuggestion(
    key: string,
    payload: DashboardPromptSuggestion
  ): Promise<void> {
    const { error } = await this.ctx.supabase.from("ai_suggestion_cache").upsert(
      { workspace_id: this.ctx.workspaceId, cache_key: key, payload },
      { onConflict: "workspace_id,cache_key" }
    );
    // Cache é conveniência: sem a tabela (migração pendente) seguimos sem ele.
    if (error) console.warn(`[ai-cache] not stored: ${error.message}`);
  }

  /** Generates a validated DashboardSpec from a natural-language request. */
  async generateDashboard(
    request: string,
    preferredDataSourceId?: string,
    analysisContext?: string
  ): Promise<DashboardSpec> {
    const context = await buildWorkspaceContext(this.ctx, preferredDataSourceId, analysisContext);
    if (!context.dataSourceId) {
      throw new ApiError(422, "Select a data source to ground the dashboard.");
    }
    // A semantic model is ideal, but the discovered physical schema is
    // enough ground truth to generate safely.
    if (!context.semanticModel && context.rawSchema.length === 0) {
      throw new ApiError(
        422,
        "This data source has no synced schema yet. Open it in Data Sources and run Sync schema first."
      );
    }
    const system = `${dashboardSpecPrompt()}\n\n# Workspace data context\n${renderContextForPrompt(context)}`;

    return this.trackRun("dashboard_generate", system + request, context.contextVersion, async () => {
      const response = await this.provider.complete({
        system,
        messages: [{ role: "user", content: request }],
        jsonMode: true,
        maxTokens: 12000,
      });

      const raw = extractJson(response.text);
      this.throwIfModelDeclined(raw);
      let spec = await this.validateSpec(raw, context);
      let inputTokens = response.inputTokens;
      let outputTokens = response.outputTokens;

      // Dry-run every widget query against the real source; give the model
      // ONE repair round with the actual database errors before saving.
      let { failures, rowCounts } = await this.dryRunWidgets(spec, context.dataSourceId!);
      if (failures.length > 0) {
        const repair = await this.provider.complete({
          system: `${dashboardRepairPrompt(
            JSON.stringify(spec, null, 2),
            failures.map((f) => `- Widget "${f.title}": ${f.error}`).join("\n")
          )}\n\n# Workspace data context\n${renderContextForPrompt(context)}`,
          messages: [{ role: "user", content: "Fix the failing widgets." }],
          jsonMode: true,
          maxTokens: 12000,
        });
        inputTokens += repair.inputTokens;
        outputTokens += repair.outputTokens;
        const repairedRaw = extractJson(repair.text);
        this.throwIfModelDeclined(repairedRaw);
        spec = await this.validateSpec(repairedRaw, context);
        ({ failures, rowCounts } = await this.dryRunWidgets(spec, context.dataSourceId!));
        if (failures.length > 0) {
          throw new ApiError(
            422,
            `The generated dashboard doesn't match this data source. Failing widgets: ${failures
              .map((f) => `"${f.title}" (${f.error})`)
              .join("; ")}. Try describing a dashboard based on the columns your data actually has.`
          );
        }
      }

      return { value: this.finalizeSpec(spec, rowCounts), inputTokens, outputTokens, model: response.model };
    });
  }

  /** The model may decline with {"error": "..."} when data and request don't match. */
  private throwIfModelDeclined(raw: unknown): void {
    if (
      raw &&
      typeof raw === "object" &&
      "error" in raw &&
      typeof (raw as { error: unknown }).error === "string"
    ) {
      throw new ApiError(422, (raw as { error: string }).error);
    }
  }

  /**
   * Executa a consulta de cada widget de verdade e devolve as falhas e o
   * número de linhas retornado — é o formato REAL do resultado que permite
   * corrigir a escolha de gráfico depois.
   */
  private async dryRunWidgets(
    spec: DashboardSpec,
    dataSourceId: string
  ): Promise<{
    failures: Array<{ title: string; error: string }>;
    rowCounts: Map<string, number>;
  }> {
    const failures: Array<{ title: string; error: string }> = [];
    const rowCounts = new Map<string, number>();
    for (const widget of spec.widgets) {
      try {
        const { result } = await executeQuery(this.ctx, dataSourceId, widget.query.sql, {
          maxRows: DRY_RUN_MAX_ROWS,
          context: { purpose: "dashboard_dry_run" },
        });
        rowCounts.set(widget.id, result.rowCount);
      } catch (error) {
        failures.push({
          title: widget.title,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { failures, rowCounts };
  }

  /**
   * Última etapa antes de salvar: corrige o tipo de gráfico com base no que a
   * consulta realmente devolveu e posiciona tudo na grade. Assim o painel
   * nunca sai desalinhado, independentemente do que o modelo escreveu.
   */
  private finalizeSpec(spec: DashboardSpec, rowCounts: Map<string, number>): DashboardSpec {
    const widgets = spec.widgets.map((w) => {
      const rows = rowCounts.get(w.id);
      return rows == null ? w : repairWidgetVisual(w, rows);
    });
    return { ...spec, widgets: applyDashboardLayout(widgets) };
  }

  /** Applies a natural-language edit to an existing validated spec. */
  async editDashboard(currentSpec: DashboardSpec, instruction: string): Promise<DashboardSpec> {
    const context = await buildWorkspaceContext(this.ctx, currentSpec.dataSourceId ?? undefined);
    const system = `${dashboardEditPrompt(JSON.stringify(currentSpec, null, 2))}\n\n# Workspace data context\n${renderContextForPrompt(context)}`;

    return this.trackRun("dashboard_edit", system + instruction, context.contextVersion, async () => {
      const response = await this.provider.complete({
        system,
        messages: [{ role: "user", content: instruction }],
        jsonMode: true,
        maxTokens: 12000,
      });
      const editedRaw = extractJson(response.text);
      this.throwIfModelDeclined(editedRaw);
      const spec = await this.validateSpec(editedRaw, context);
      // Sem fonte resolvida não há como medir o resultado: reposiciona só.
      const rowCounts = context.dataSourceId
        ? (await this.dryRunWidgets(spec, context.dataSourceId)).rowCounts
        : new Map<string, number>();
      return {
        value: this.finalizeSpec(spec, rowCounts),
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        model: response.model,
      };
    });
  }

  /** Parses a natural-language business rule into a structured definition. */
  async parseBusinessRule(text: string): Promise<Record<string, unknown>> {
    const context = await buildWorkspaceContext(this.ctx);
    const system = `${businessRulePrompt()}\n\n# Workspace data context\n${renderContextForPrompt(context)}`;

    return this.trackRun("business_rule_parse", system + text, context.contextVersion, async () => {
      const response = await this.provider.complete({
        system,
        messages: [{ role: "user", content: text }],
        jsonMode: true,
        maxTokens: 2000,
      });
      return {
        value: extractJson<Record<string, unknown>>(response.text),
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        model: response.model,
      };
    });
  }

  /** Validates the LLM's spec: schema + every widget's SQL. */
  private async validateSpec(raw: unknown, context: WorkspaceAiContext): Promise<DashboardSpec> {
    const dialect = context.dialect ?? "postgres";
    const candidate = {
      dialect,
      dataSourceId: context.dataSourceId ?? undefined,
      ...(stripNulls(raw) as Record<string, unknown>),
    };
    const parsed = dashboardSpecSchema.safeParse(candidate);
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new ApiError(422, `AI produced an invalid dashboard specification: ${issues.join("; ")}`);
    }

    const spec = parsed.data;
    const errors: string[] = [];
    for (const widget of spec.widgets) {
      const validation = validateReadOnlySql(widget.query.sql, dialect);
      if (!validation.valid) {
        errors.push(`Widget "${widget.title}": ${validation.errors.join("; ")}`);
      }
    }
    if (errors.length > 0) {
      throw new ApiError(422, `Dashboard specification contains invalid queries: ${errors.join(" | ")}`);
    }
    return spec;
  }
}
