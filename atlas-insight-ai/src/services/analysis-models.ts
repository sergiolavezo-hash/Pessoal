import "server-only";
import type { ApiContext } from "@/services/api-context";
import { ApiError } from "@/services/api-context";

/**
 * Modelos de análise: conjuntos de datasets nomeados pelo usuário.
 *
 * "Modelo Comercial", "Modelo Financeiro" — o nome é dele, e não carrega
 * número de versão. A revisão interna existe para auditoria e fica fora da
 * tela, porque um nome que muda sozinho ("Modelo Comercial V3") faz o usuário
 * procurar o que ele mesmo criou.
 *
 * O modelo REFERENCIA datasets; nunca copia. O mesmo dataset participa de
 * vários modelos e o dado continua existindo uma única vez.
 */

export interface AnalysisModel {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  datasetCount: number;
  updatedAt: string;
}

export interface AnalysisModelDetail extends AnalysisModel {
  datasets: Array<{
    id: string;
    name: string;
    datasetStatus: string | null;
    qualityScore: number | null;
    rowCount: number | null;
  }>;
}

const NAME_MAX = 80;

/** Nomes que só diferem em espaço ou caixa são o mesmo nome para quem lê. */
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function assertValidName(name: string): string {
  const clean = normalizeName(name);
  if (clean.length < 2) throw new ApiError(400, "Dê um nome ao modelo.");
  if (clean.length > NAME_MAX) {
    throw new ApiError(400, `O nome do modelo deve ter até ${NAME_MAX} caracteres.`);
  }
  // Números de versão no nome são o problema que a revisão interna resolve.
  return clean;
}

export async function listModels(ctx: ApiContext): Promise<AnalysisModel[]> {
  const { data, error } = await ctx.supabase
    .from("analysis_models")
    .select("id, name, description, status, updated_at, analysis_model_datasets(model_id)")
    .eq("workspace_id", ctx.workspaceId)
    .eq("status", "ACTIVE")
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return []; // migração 0018 pendente
    throw new ApiError(500, error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    status: row.status as "ACTIVE" | "ARCHIVED",
    datasetCount: Array.isArray(row.analysis_model_datasets)
      ? row.analysis_model_datasets.length
      : 0,
    updatedAt: row.updated_at as string,
  }));
}

export async function createModel(
  ctx: ApiContext,
  input: { name: string; description?: string; dataSourceIds: string[] }
): Promise<{ id: string }> {
  const name = assertValidName(input.name);

  if (input.dataSourceIds.length === 0) {
    throw new ApiError(400, "Escolha ao menos um conjunto de dados para o modelo.");
  }

  const { data: model, error } = await ctx.supabase
    .from("analysis_models")
    .insert({
      workspace_id: ctx.workspaceId,
      name,
      description: input.description?.trim() || null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !model) {
    if (error?.code === "23505") {
      throw new ApiError(409, `Já existe um modelo chamado "${name}".`);
    }
    throw new ApiError(500, error?.message ?? "Falha ao criar o modelo.");
  }

  await setModelDatasets(ctx, model.id as string, input.dataSourceIds);
  return { id: model.id as string };
}

/**
 * Substitui a lista de datasets do modelo. Escrever a lista inteira, em vez
 * de diferenças, evita que uma falha no meio deixe o modelo com metade dos
 * datasets antigos e metade dos novos.
 */
export async function setModelDatasets(
  ctx: ApiContext,
  modelId: string,
  dataSourceIds: string[]
): Promise<void> {
  const unique = [...new Set(dataSourceIds)];

  // As fontes precisam ser deste workspace — o id vem do cliente.
  const { data: owned, error: ownedError } = await ctx.supabase
    .from("data_sources")
    .select("id")
    .eq("workspace_id", ctx.workspaceId)
    .in("id", unique);
  if (ownedError) throw new ApiError(500, ownedError.message);

  const allowed = new Set((owned ?? []).map((r) => r.id as string));
  const rejected = unique.filter((id) => !allowed.has(id));
  if (rejected.length > 0) {
    throw new ApiError(400, "Um dos conjuntos de dados escolhidos não pertence a este workspace.");
  }

  await ctx.supabase.from("analysis_model_datasets").delete().eq("model_id", modelId);

  if (allowed.size === 0) return;
  const { error } = await ctx.supabase.from("analysis_model_datasets").insert(
    [...allowed].map((dataSourceId) => ({
      model_id: modelId,
      data_source_id: dataSourceId,
      workspace_id: ctx.workspaceId,
    }))
  );
  if (error) throw new ApiError(500, error.message);

  // A revisão sobe a cada mudança de composição; o nome permanece o mesmo.
  await bumpRevision(ctx, modelId);
}

async function bumpRevision(ctx: ApiContext, modelId: string): Promise<void> {
  const { data } = await ctx.supabase
    .from("analysis_models")
    .select("revision")
    .eq("id", modelId)
    .maybeSingle();
  const current = (data?.revision as number | undefined) ?? 1;
  await ctx.supabase
    .from("analysis_models")
    .update({ revision: current + 1 })
    .eq("id", modelId);
}

export async function renameModel(
  ctx: ApiContext,
  modelId: string,
  name: string
): Promise<void> {
  const clean = assertValidName(name);
  const { error } = await ctx.supabase
    .from("analysis_models")
    .update({ name: clean })
    .eq("id", modelId)
    .eq("workspace_id", ctx.workspaceId);
  if (error) {
    if (error.code === "23505") {
      throw new ApiError(409, `Já existe um modelo chamado "${clean}".`);
    }
    throw new ApiError(500, error.message);
  }
}
