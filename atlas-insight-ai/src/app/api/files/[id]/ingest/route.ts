import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { fileTableName } from "@/services/data-sources";
import {
  countIngestedRows,
  dedupeRows,
  insertRowsFrom,
  logicalTableName,
} from "@/services/file-ingest";
import { INGEST_BUDGET_MS, downloadUpload, finishIngest, parseUpload } from "@/services/file-pipeline";
import { extensionOf } from "@/lib/uploads";

export const maxDuration = 60;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * Continua a ingestão de um arquivo grande.
 *
 * Um arquivo de 300 mil linhas são ~150 idas ao banco e não cabe nos 60
 * segundos de uma função. O primeiro POST /api/files prepara a tabela e
 * insere o que dá no tempo; o navegador chama esta rota até acabar. É o mesmo
 * princípio de particionar a carga: cada pedido cuida de uma fatia, e nenhum
 * deles morre no meio levando o arquivo junto.
 *
 * O ponto de retomada NÃO vem do navegador — vem da contagem no banco. Quem
 * recarregou a página no meio mandaria um número errado, e um número errado
 * aqui significa linha duplicada ou linha faltando na base do cliente.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    // Pelo cliente com RLS: um arquivo de outro workspace simplesmente não
    // aparece, então não há o que conferir depois.
    const { data: fileRow } = await ctx.supabase
      .from("workspace_files")
      .select("id, name, status, storage_path, data_source_id, content_hash, catalog_table_id")
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();
    if (!fileRow) throw new ApiError(404, "Arquivo não encontrado.");
    if (fileRow.status !== "PROCESSING") {
      throw new ApiError(409, "Este arquivo não está em ingestão.");
    }
    if (!fileRow.data_source_id) {
      throw new ApiError(409, "A ingestão deste arquivo não chegou a começar. Reenvie o arquivo.");
    }

    // A tabela de destino é DERIVADA do arquivo, no servidor. Antes ela vinha
    // no corpo do pedido, e a conferência comparava a data_source da tabela
    // com a do arquivo — só que TODO upload do workspace divide uma única
    // fonte "Arquivos enviados", então aquela conferência passava para
    // qualquer tabela do workspace. Um cliente adulterado mandava o id da
    // tabela de "faturamento" e despejava as linhas de "clientes" dentro
    // dela. Não recebendo o id, não há o que forjar.
    // A posse gravada na preparação é a resposta exata; o nome derivado é só
    // o caminho de volta para uploads anteriores à migração 0021. Derivar
    // sempre pelo nome ficaria ERRADO desde que dois arquivos podem colidir e
    // o segundo receber um nome com sufixo.
    const ownedTableId = (fileRow.catalog_table_id as string | null) ?? null;
    const query = ctx.supabase
      .from("catalog_tables")
      .select("id, datasets!inner(data_source_id)")
      .eq("workspace_id", ctx.workspaceId)
      .eq("datasets.data_source_id", fileRow.data_source_id);

    const { data: tableRow } = ownedTableId
      ? await query.eq("id", ownedTableId).maybeSingle()
      : await query.eq("name", logicalTableName(fileRow.name as string)).maybeSingle();

    if (!tableRow) {
      throw new ApiError(404, "A tabela deste arquivo não existe mais. Reenvie o arquivo.");
    }

    const admin = createAdminClient();
    const physicalName = fileTableName(tableRow.id);

    const buffer = await downloadUpload(admin, fileRow.storage_path);
    const parsed = parseUpload(buffer, extensionOf(fileRow.name));

    // A MESMA deduplicação da preparação, pela mesma função: é o que faz a
    // contagem no banco apontar para a linha certa desta lista.
    const rows = dedupeRows(parsed.rows);

    const offset = await countIngestedRows(admin, physicalName);
    if (offset > rows.length) {
      // O arquivo no Storage não é mais o que gerou esta tabela. Continuar
      // misturaria duas leituras diferentes na mesma base.
      throw new ApiError(409, "O arquivo mudou durante a importação. Reenvie o arquivo.");
    }

    const inserted = await insertRowsFrom(
      admin,
      physicalName,
      rows,
      offset,
      startedAt + INGEST_BUDGET_MS
    );

    if (inserted < rows.length) {
      return NextResponse.json(
        { ingest: { fileId: fileRow.id, offset: inserted, total: rows.length } },
        { status: 202 }
      );
    }

    await finishIngest(ctx, {
      fileId: fileRow.id,
      tableId: tableRow.id,
      dataSourceId: fileRow.data_source_id,
      rowCount: rows.length,
      columnCount: parsed.columns.length,
      physicalName,
      dedupedCount: parsed.rows.length - rows.length,
      contentHash: (fileRow.content_hash as string | null) ?? null,
    });

    return NextResponse.json({
      done: true,
      table: {
        dataSourceId: fileRow.data_source_id,
        tableId: tableRow.id,
        physicalName,
        rowCount: rows.length,
        dedupedCount: parsed.rows.length - rows.length,
      },
      warnings: parsed.warnings,
      pipelineQueued: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
