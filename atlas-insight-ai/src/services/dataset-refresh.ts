import "server-only";
import { sha256 } from "@/lib/crypto";
import type { ApiContext } from "@/services/api-context";
import { syncDataSource } from "@/services/data-sources";
import { profileDataSource } from "@/services/profiling";
import { buildWorkspaceContext } from "@/ai/context";
import { scoreDataset } from "@/ai/dataset-quality";
import { minDatasetQualityScore } from "@/ai/config";
import { diffSchemas, hasSchemaChanges, publishRevision, type SchemaDiff } from "@/services/datasets";
import { invalidateAiCache } from "@/services/file-dedup";

/**
 * Atualizar um Dataset.
 *
 * Três garantias, nesta ordem:
 *
 *   1. NADA MUDOU não reprocessa. Se o esquema da origem é idêntico ao da
 *      última versão publicada, a atualização termina aqui — sem perfil, sem
 *      modelo semântico, sem invalidar cache.
 *   2. PUBLICAR É ATÔMICO. A versão nova só substitui a atual depois de passar
 *      no portão de qualidade; reprovada, a anterior continua no ar e o motivo
 *      fica registrado.
 *   3. MUDANÇA DE ESQUEMA É AVISO, NÃO QUEBRA. Colunas removidas viram um
 *      alerta com nome de painel e de coluna, em vez de um gráfico vazio que
 *      o usuário descobre sozinho.
 */

export interface RefreshResult {
  changed: boolean;
  published: boolean;
  revision?: number;
  score?: number;
  problems?: string[];
  schemaChanges?: SchemaDiff;
  reason?: string;
  message: string;
}

interface ColumnRef {
  name: string;
  type: string;
}

/**
 * Esquema atual da fonte, achatado em nome+tipo por tabela. É a base tanto do
 * "nada mudou" quanto do diff que gera a análise de impacto.
 */
async function snapshotSchema(ctx: ApiContext, dataSourceId: string): Promise<ColumnRef[]> {
  const { data, error } = await ctx.supabase
    .from("catalog_columns")
    .select("name, data_type, catalog_tables!inner(name, datasets!inner(data_source_id))")
    .eq("catalog_tables.datasets.data_source_id", dataSourceId);

  if (error || !data) return [];

  return data
    .map((row) => {
      const table = row.catalog_tables as unknown as { name: string } | null;
      return {
        name: `${table?.name ?? "?"}.${row.name as string}`,
        type: row.data_type as string,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Impressão digital do esquema, para responder "nada mudou" sem reprocessar. */
export function schemaFingerprint(columns: ColumnRef[]): string {
  return sha256(columns.map((c) => `${c.name}:${c.type}`).join("|"));
}

export async function refreshDataset(
  ctx: ApiContext,
  dataSourceId: string
): Promise<RefreshResult> {
  const before = await snapshotSchema(ctx, dataSourceId);

  await ctx.supabase
    .from("data_sources")
    .update({ dataset_status: "REFRESHING" })
    .eq("id", dataSourceId)
    // Coluna ausente (migração 0018 pendente) não pode impedir a atualização.
    .then(undefined, () => undefined);

  await syncDataSource(ctx, dataSourceId);

  const after = await snapshotSchema(ctx, dataSourceId);
  const fingerprint = schemaFingerprint(after);

  // Nada mudou: encerra sem reprocessar nem invalidar o cache. Reprocessar
  // aqui gastaria perfil, modelo semântico e a cota de IA para chegar
  // exatamente ao que já está publicado.
  const { data: current } = await ctx.supabase
    .from("data_sources")
    .select("content_hash, revision")
    .eq("id", dataSourceId)
    .maybeSingle();

  if (current?.content_hash && current.content_hash === fingerprint) {
    await ctx.supabase
      .from("data_sources")
      .update({ dataset_status: "PUBLISHED", last_refresh_at: new Date().toISOString() })
      .eq("id", dataSourceId)
      .then(undefined, () => undefined);
    return {
      changed: false,
      published: false,
      revision: (current.revision as number | undefined) ?? undefined,
      message: "Seus dados já estão atualizados — nada mudou na origem.",
    };
  }

  const schemaChanges = diffSchemas(before, after);

  // O perfil é o que alimenta a nota: papéis das colunas, vazios, contagens.
  try {
    await profileDataSource(ctx, dataSourceId);
  } catch (error) {
    console.error("[refresh] profiling", error);
  }

  const context = await buildWorkspaceContext(ctx, dataSourceId);
  const quality = scoreDataset(context);

  const result = await publishRevision(ctx.supabase, dataSourceId, {
    score: quality.score,
    problems: quality.problems,
    columnCount: after.length,
    contentHash: fingerprint,
    minScore: minDatasetQualityScore(),
    schemaDiff: schemaChanges,
  });

  if (!result.published) {
    return {
      changed: true,
      published: false,
      score: quality.score,
      problems: quality.problems,
      reason: result.reason,
      message:
        "A nova versão tem problemas de qualidade e não substituiu a atual. " +
        "Seus dados anteriores continuam no ar.",
    };
  }

  await invalidateAiCache(ctx.workspaceId);

  return {
    changed: true,
    published: true,
    revision: result.revision,
    score: quality.score,
    schemaChanges: hasSchemaChanges(schemaChanges) ? schemaChanges : undefined,
    message: hasSchemaChanges(schemaChanges)
      ? "Dados atualizados. As colunas mudaram — confira os painéis que dependem delas."
      : "Dados atualizados.",
  };
}
