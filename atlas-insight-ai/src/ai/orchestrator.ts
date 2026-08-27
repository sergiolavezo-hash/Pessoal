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
  dashboardSpecPrompt,
  intentAndSqlPrompt,
  sqlRepairPrompt,
} from "@/ai/prompts";
import { validateReadOnlySql } from "@/ai/query-engine/sql-validator";
import { executeQuery, type ExecutionRecord } from "@/services/query-engine";
import { dashboardSpecSchema, type DashboardSpec } from "@/dashboards/spec";
import type { ApiContext } from "@/services/api-context";
import { ApiError } from "@/services/api-context";

const MAX_SQL_ATTEMPTS = 3;

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
    fn: () => Promise<{ value: T; inputTokens: number; outputTokens: number; queryExecutionId?: string }>
  ): Promise<T> {
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
      const { value, inputTokens, outputTokens, queryExecutionId } = await fn();
      if (run) {
        await this.ctx.supabase
          .from("ai_runs")
          .update({
            status: "SUCCEEDED",
            input_tokens: inputTokens,
            output_tokens: outputTokens,
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
    preferredDataSourceId?: string
  ): Promise<{ sqlAnswer: SqlAnswer; execution: ExecutionRecord; context: WorkspaceAiContext }> {
    const context = await buildWorkspaceContext(this.ctx, preferredDataSourceId);
    if (!context.dataSourceId || !context.semanticModel) {
      throw new ApiError(
        422,
        "No active semantic model. Connect a data source, run profiling and generate a semantic model first."
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

        const parsed = sqlAnswerSchema.parse(extractJson(response.text));
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
  async chat(question: string, preferredDataSourceId?: string) {
    const { sqlAnswer, execution, context } = await this.answerWithData(question, preferredDataSourceId);

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
        value: chatAnswerSchema.parse(extractJson(response.text)),
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        queryExecutionId: execution.executionId,
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

  /** Generates a validated DashboardSpec from a natural-language request. */
  async generateDashboard(request: string, preferredDataSourceId?: string): Promise<DashboardSpec> {
    const context = await buildWorkspaceContext(this.ctx, preferredDataSourceId);
    if (!context.dataSourceId || !context.semanticModel) {
      throw new ApiError(
        422,
        "No active semantic model. Connect a data source, run profiling and generate a semantic model first."
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

      const spec = await this.validateSpec(extractJson(response.text), context);
      return { value: spec, inputTokens: response.inputTokens, outputTokens: response.outputTokens };
    });
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
      const spec = await this.validateSpec(extractJson(response.text), context);
      return { value: spec, inputTokens: response.inputTokens, outputTokens: response.outputTokens };
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
      };
    });
  }

  /** Validates the LLM's spec: schema + every widget's SQL. */
  private async validateSpec(raw: unknown, context: WorkspaceAiContext): Promise<DashboardSpec> {
    const dialect = context.dialect ?? "postgres";
    const candidate = {
      dialect,
      dataSourceId: context.dataSourceId ?? undefined,
      ...(raw as Record<string, unknown>),
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
