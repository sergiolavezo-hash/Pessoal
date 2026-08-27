import "server-only";
import type { ApiContext } from "@/services/api-context";
import { ApiError } from "@/services/api-context";
import { validateMetricFormula, type MetricDefinition } from "@/metrics/engine";
import { semanticModelSchema, type SemanticModel } from "@/semantic/schema";
import type { Metric } from "@/types";

/** The workspace's ACTIVE semantic model (newest first), or null. */
export async function getActiveSemanticModel(
  ctx: ApiContext,
  semanticModelId?: string | null
): Promise<{ id: string; model: SemanticModel } | null> {
  let query = ctx.supabase
    .from("semantic_models")
    .select("id, definition")
    .eq("workspace_id", ctx.workspaceId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(1);
  if (semanticModelId) {
    query = ctx.supabase.from("semantic_models").select("id, definition").eq("id", semanticModelId).limit(1);
  }
  const { data } = await query;
  const row = data?.[0];
  if (!row) return null;
  const parsed = semanticModelSchema.safeParse(row.definition);
  if (!parsed.success) return null;
  return { id: row.id, model: parsed.data };
}

export async function listWorkspaceMetrics(ctx: ApiContext): Promise<Metric[]> {
  const { data, error } = await ctx.supabase
    .from("metrics")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw new ApiError(500, error.message);
  return (data ?? []) as Metric[];
}

export function toMetricDefinitions(metrics: Metric[]): MetricDefinition[] {
  return metrics.map((m) => ({ slug: m.slug, name: m.name, formula: m.formula, format: m.format }));
}

export async function validateMetricForWorkspace(
  ctx: ApiContext,
  formula: string,
  selfSlug?: string,
  semanticModelId?: string | null
) {
  const [active, metrics] = await Promise.all([
    getActiveSemanticModel(ctx, semanticModelId),
    listWorkspaceMetrics(ctx),
  ]);
  const result = validateMetricFormula(formula, active?.model ?? null, toMetricDefinitions(metrics), selfSlug);
  return { ...result, semanticModelId: active?.id ?? null };
}
