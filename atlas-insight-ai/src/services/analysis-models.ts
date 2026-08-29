import "server-only";
import type { ApiContext } from "@/services/api-context";
import { ApiError } from "@/services/api-context";

/**
 * Modelos de análise: conjuntos de TABELAS nomeados pelo usuário.
 *
 * O grão é a tabela, não a fonte. Todo arquivo enviado cai na mesma fonte
 * ("Arquivos enviados"), então escolher por fonte arrastava todas as
 * planilhas do cliente de uma vez. Ele precisa poder montar um modelo com
 * duas tabelas de um banco mais um arquivo, ou olhar uma tabela sozinha para
 * fazer um painel só dela.
 *
 * "Modelo Comercial", "Modelo Financeiro" — o nome é dele e não carrega
 * número de versão. A revisão interna existe para auditoria e fica fora da
 * tela: um nome que muda sozinho faz a pessoa procurar o que ela criou.
 *
 * O modelo REFERENCIA tabelas; nunca copia. A mesma tabela participa de
 * vários modelos e o dado continua existindo uma única vez.
 */

export interface AnalysisModel {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  tableCount: number;
  updatedAt: string;
}

/** Uma tabela que pode entrar num modelo, com a origem para agrupar na tela. */
export interface SelectableTable {
  id: string;
  name: string;
  rowCount: number | null;
  columnCount: number;
  sourceId: string;
  sourceName: string;
}

const NAME_MAX = 80;

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function assertValidName(name: string): string {
  const clean = normalizeName(name);
  if (clean.length < 2) throw new ApiError(400, "Dê um nome ao modelo.");
  if (clean.length > NAME_MAX) {
    throw new ApiError(400, `O nome do modelo deve ter até ${NAME_MAX} caracteres.`);
  }
  return clean;
}

/**
 * Todas as tabelas do workspace, com a fonte a que pertencem.
 *
 * Agrupar por fonte na tela é o que devolve ao usuário a noção de "este
 * arquivo" e "aquele banco" sem obrigá-lo a levar a fonte inteira.
 */
export async function listSelectableTables(ctx: ApiContext): Promise<SelectableTable[]> {
  const { data, error } = await ctx.supabase
    .from("catalog_tables")
    .select(
      "id, name, row_count, catalog_columns(id), datasets!inner(data_source_id, data_sources!inner(id, name, deleted_at))"
    )
    .eq("workspace_id", ctx.workspaceId)
    .order("name");

  if (error) {
    if (error.code === "42P01") return [];
    throw new ApiError(500, error.message);
  }

  return (data ?? [])
    .map((row) => {
      const dataset = row.datasets as unknown as {
        data_sources: { id: string; name: string; deleted_at: string | null } | null;
      } | null;
      const source = dataset?.data_sources;
      if (!source || source.deleted_at) return null;

      return {
        id: row.id as string,
        name: row.name as string,
        rowCount: (row.row_count as number | null) ?? null,
        columnCount: Array.isArray(row.catalog_columns) ? row.catalog_columns.length : 0,
        sourceId: source.id,
        sourceName: source.name,
      };
    })
    .filter((t): t is SelectableTable => t != null);
}

export async function listModels(ctx: ApiContext): Promise<AnalysisModel[]> {
  const { data, error } = await ctx.supabase
    .from("analysis_models")
    .select("id, name, description, status, updated_at, analysis_model_tables(model_id)")
    .eq("workspace_id", ctx.workspaceId)
    .eq("status", "ACTIVE")
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return []; // migração pendente
    throw new ApiError(500, error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    status: row.status as "ACTIVE" | "ARCHIVED",
    tableCount: Array.isArray(row.analysis_model_tables) ? row.analysis_model_tables.length : 0,
    updatedAt: row.updated_at as string,
  }));
}

export async function createModel(
  ctx: ApiContext,
  input: { name: string; description?: string; tableIds: string[] }
): Promise<{ id: string }> {
  const name = assertValidName(input.name);

  if (input.tableIds.length === 0) {
    throw new ApiError(400, "Escolha ao menos uma tabela para o modelo.");
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

  await setModelTables(ctx, model.id as string, input.tableIds);
  return { id: model.id as string };
}

/**
 * Substitui a lista de tabelas do modelo.
 *
 * Escrever a lista inteira, em vez de diferenças, evita que uma falha no meio
 * deixe o modelo com metade das tabelas antigas e metade das novas.
 */
export async function setModelTables(
  ctx: ApiContext,
  modelId: string,
  tableIds: string[]
): Promise<void> {
  const unique = [...new Set(tableIds)];

  // Os ids vêm do cliente: confirmar que são deste workspace antes de gravar.
  const { data: owned, error: ownedError } = await ctx.supabase
    .from("catalog_tables")
    .select("id")
    .eq("workspace_id", ctx.workspaceId)
    .in("id", unique);
  if (ownedError) throw new ApiError(500, ownedError.message);

  const allowed = new Set((owned ?? []).map((r) => r.id as string));
  if (unique.some((id) => !allowed.has(id))) {
    throw new ApiError(400, "Uma das tabelas escolhidas não pertence a este workspace.");
  }

  await ctx.supabase.from("analysis_model_tables").delete().eq("model_id", modelId);

  if (allowed.size > 0) {
    const { error } = await ctx.supabase.from("analysis_model_tables").insert(
      [...allowed].map((tableId) => ({
        model_id: modelId,
        table_id: tableId,
        workspace_id: ctx.workspaceId,
      }))
    );
    if (error) throw new ApiError(500, error.message);
  }

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
