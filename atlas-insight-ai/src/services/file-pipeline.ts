import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, auditLog, type ApiContext } from "@/services/api-context";
import { FILES_BUCKET } from "@/lib/uploads";
import {
  buildParsedFromMatrix,
  parseCsvMatrix,
  parseXlsxMatrix,
  type ParsedFile,
} from "@/services/file-ingest";
import { invalidateAiCache } from "@/services/file-dedup";
import { profileDataSource } from "@/services/profiling";
import { generateSemanticModel } from "@/semantic/generator";
import { buildWorkspaceContext } from "@/ai/context";
import { scoreDataset } from "@/ai/dataset-quality";
import { minDatasetQualityScore } from "@/ai/config";
import { publishRevision } from "@/services/datasets";

/**
 * As duas metades da ingestão que os dois pedidos compartilham.
 *
 * Um arquivo grande não entra num pedido só: o primeiro POST prepara a tabela
 * e insere o que der em 60 segundos, e o navegador volta em /ingest para
 * continuar. Como os dois lados precisam ler o arquivo do mesmo jeito e
 * encerrar do mesmo jeito, essas duas partes moram aqui — duplicá-las nas
 * rotas é como as duas metades acabam divergindo em silêncio.
 */

/** Prazo de inserção dentro de um pedido, contado a partir da entrada. */
export const INGEST_BUDGET_MS = 38_000;

export async function downloadUpload(
  admin: SupabaseClient,
  storagePath: string
): Promise<ArrayBuffer> {
  const { data, error } = await admin.storage.from(FILES_BUCKET).download(storagePath);
  if (error || !data) {
    throw new ApiError(422, error?.message ?? "Não foi possível ler o arquivo enviado.");
  }
  return data.arrayBuffer();
}

/**
 * Leitura HEURÍSTICA do arquivo — sem IA, de propósito.
 *
 * A continuação de uma ingestão precisa chegar EXATAMENTE às mesmas linhas na
 * mesma ordem, senão o ponto de parada aponta para outra coisa e o arquivo
 * entra embaralhado. Uma chamada de IA não dá essa garantia (e cobraria token
 * a cada pedaço), então a remontagem por IA acontece uma vez só, no primeiro
 * pedido, e quando acontece o arquivo é ingerido inteiro ali mesmo.
 */
export function parseUpload(buffer: ArrayBuffer, extension: string): ParsedFile {
  const { matrix, warnings } =
    extension === "csv"
      ? parseCsvMatrix(new TextDecoder().decode(buffer))
      : parseXlsxMatrix(buffer);
  return buildParsedFromMatrix(matrix, [...warnings]);
}

export interface FinishedIngest {
  fileId: string;
  dataSourceId: string;
  rowCount: number;
  columnCount: number;
  physicalName: string;
  dedupedCount: number;
  contentHash: string | null;
}

/**
 * Encerra a ingestão: marca o arquivo pronto e dispara o entendimento.
 *
 * Perfil, modelo semântico e nota de qualidade rodam DEPOIS da resposta. No
 * caminho do pedido eles somavam ao tempo já gasto inserindo linhas e o
 * upload morria com o arquivo preso em "processando".
 */
export async function finishIngest(ctx: ApiContext, result: FinishedIngest): Promise<void> {
  await ctx.supabase
    .from("workspace_files")
    .update({ status: "READY", data_source_id: result.dataSourceId })
    .eq("id", result.fileId);

  // Dados novos tornam as respostas guardadas obsoletas: o cache expira por
  // tempo, mas não sabe que a base mudou.
  await invalidateAiCache(ctx.workspaceId);

  await auditLog(ctx, "uploaded_file", "file", result.fileId, {
    rows: result.rowCount,
    deduped: result.dedupedCount,
    table: result.physicalName,
  });

  after(async () => {
    try {
      await profileDataSource(ctx, result.dataSourceId);
    } catch (error) {
      console.error("[auto-pipeline] profiling", error);
    }
    try {
      await generateSemanticModel(ctx, result.dataSourceId);
    } catch (error) {
      console.error("[auto-pipeline] semantic model", error);
    }
    // A nota de qualidade só faz sentido depois do perfil: é dele que saem
    // papéis das colunas, vazios e contagens. Publicar aqui é o que torna o
    // portão real — uma base reprovada fica visível com o motivo, em vez de
    // virar um painel de gráficos em branco.
    try {
      const context = await buildWorkspaceContext(ctx, result.dataSourceId);
      const quality = scoreDataset(context);
      await publishRevision(ctx.supabase, result.dataSourceId, {
        score: quality.score,
        problems: quality.problems,
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        contentHash: result.contentHash ?? "",
        minScore: minDatasetQualityScore(),
      });
    } catch (error) {
      console.error("[auto-pipeline] publish revision", error);
    }
  });
}
