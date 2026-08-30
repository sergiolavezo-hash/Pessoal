import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildParsedFromMatrix,
  insertRowsFrom,
  logicalTableName,
  parseCsvMatrix,
  parseXlsxMatrix,
  prepareIngest,
  type ParsedFile,
} from "@/services/file-ingest";
import { applyRestructurePlan, looksUnstructured } from "@/ai/file-restructure";
import { AIOrchestrator } from "@/ai/orchestrator";
import { findDuplicate, hashFileContent } from "@/services/file-dedup";
import { INGEST_BUDGET_MS, downloadUpload, finishIngest } from "@/services/file-pipeline";
import { FILES_BUCKET, extensionOf, isUploadPathFor, uploadRejection } from "@/lib/uploads";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const { data, error } = await ctx.supabase
      .from("workspace_files")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ files: data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Segunda etapa do envio: o arquivo JÁ está no Storage, e o que chega aqui é
 * o caminho dele — algumas centenas de bytes.
 *
 * O corpo do pedido deixou de carregar a planilha porque a função da Vercel
 * recusa corpo acima de ~4,5 MB na borda, antes de este código rodar: o
 * usuário via um 413 sem explicação e o limite de 50 MB escrito aqui nunca
 * chegava a ser conferido. Ver src/lib/uploads.ts.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = (await request.json().catch(() => null)) as {
      workspaceId?: unknown;
      storagePath?: unknown;
      name?: unknown;
      mimeType?: unknown;
    } | null;

    if (typeof body?.workspaceId !== "string") throw new ApiError(400, "workspaceId is required");
    if (typeof body.name !== "string" || body.name.trim() === "") {
      throw new ApiError(400, "name is required");
    }

    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    // O caminho volta pela mão do navegador, então é texto não confiável: sem
    // esta conferência um membro deste workspace poderia mandar importar o
    // objeto de outro. O formato fechado também impede travessia de pasta.
    if (!isUploadPathFor(body.storagePath, ctx.workspaceId)) {
      throw new ApiError(400, "Envio inválido. Recomece o upload do arquivo.");
    }
    const storagePath = body.storagePath;

    const fileName = body.name;
    const mimeType = typeof body.mimeType === "string" && body.mimeType ? body.mimeType : null;
    const extension = extensionOf(fileName);

    const admin = createAdminClient();

    // O tamanho é conferido no OBJETO, não no que o navegador declarou: o
    // tamanho anunciado na etapa da URL assinada é só um número num JSON, e
    // quem envia escolhe o número.
    // O erro do Storage não pode ser engolido: falha de permissão ou serviço
    // fora do ar viravam "arquivo não encontrado", mandando o usuário reenviar
    // um arquivo que está lá — e escondendo a causa de quem for investigar.
    const { data: info, error: infoError } = await admin.storage
      .from(FILES_BUCKET)
      .info(storagePath);
    if (infoError) {
      console.error("[files] storage.info", infoError);
      throw new ApiError(502, `O armazenamento não respondeu: ${infoError.message}`);
    }
    const objectSize = typeof info?.size === "number" ? info.size : null;
    if (objectSize === null) {
      throw new ApiError(400, "Arquivo não encontrado no armazenamento. Recomece o envio.");
    }
    const rejection = uploadRejection(fileName, objectSize);
    if (rejection) {
      // Recusado é recusado: deixar o objeto no bucket ocuparia espaço que
      // ninguém mais vai procurar.
      await admin.storage.from(FILES_BUCKET).remove([storagePath]);
      throw new ApiError(400, rejection);
    }

    const buffer = await downloadUpload(admin, storagePath);

    // Impressão digital do conteúdo antes de qualquer processamento: o mesmo
    // arquivo reenviado refazia parse, perfil, modelo semântico e — quando o
    // layout parecia bagunçado — uma chamada de IA, para chegar ao dataset que
    // já existia. Comparar o hash custa milissegundos e evita tudo isso.
    const contentHash = hashFileContent(buffer);
    const duplicate = await findDuplicate(ctx.workspaceId, contentHash);
    if (duplicate) {
      await admin.storage.from(FILES_BUCKET).remove([storagePath]);
      return NextResponse.json(
        {
          duplicate: true,
          message: "Este arquivo já está cadastrado no Atlas.",
          file: {
            id: duplicate.id,
            name: duplicate.name,
            dataSourceId: duplicate.dataSourceId,
            createdAt: duplicate.createdAt,
          },
        },
        { status: 409 }
      );
    }

    // Track the upload.
    const { data: fileRow, error: fileError } = await ctx.supabase
      .from("workspace_files")
      .insert({
        workspace_id: ctx.workspaceId,
        name: fileName,
        kind: "data",
        mime_type: mimeType,
        size_bytes: objectSize,
        content_hash: contentHash,
        storage_path: storagePath,
        status: "PROCESSING",
        uploaded_by: ctx.user.id,
      })
      .select()
      .single();
    if (fileError || !fileRow) throw new ApiError(500, fileError?.message ?? "Failed to record file");

    // Duas importações do MESMO nome ao mesmo tempo se atropelam: a tabela
    // física é derivada do nome do arquivo, e preparar a segunda derruba a
    // tabela que a primeira ainda está preenchendo — o cliente ficaria com as
    // duas leituras misturadas. O corte de 30 minutos existe para que um
    // envio que morreu no meio não bloqueie o próximo para sempre.
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: running } = await ctx.supabase
      .from("workspace_files")
      .select("id, name")
      .eq("workspace_id", ctx.workspaceId)
      .eq("status", "PROCESSING")
      .neq("id", fileRow.id)
      .gte("created_at", since);
    // Compara o nome LÓGICO, não o nome do arquivo. A tabela física vem do
    // nome já normalizado, então "Vendas 2024.csv" e "vendas-2024.xlsx"
    // disputam a MESMA tabela — e a guarda antiga, que comparava o nome cru,
    // deixava as duas passarem. A segunda derrubava a tabela que a primeira
    // ainda estava preenchendo.
    const mine = logicalTableName(fileName);
    const clashing = (running ?? []).filter((f) => logicalTableName(f.name as string) === mine);
    if (clashing.length > 0) {
      await ctx.supabase.from("workspace_files").delete().eq("id", fileRow.id);
      await admin.storage.from(FILES_BUCKET).remove([storagePath]);
      throw new ApiError(
        409,
        "Já existe uma importação em andamento que grava na mesma tabela deste arquivo. Aguarde ela terminar."
      );
    }

    try {
      // O arquivo cru fica no Storage, no caminho para onde o navegador o
      // enviou, para reprocessamento e auditoria.
      const { matrix, warnings: parseWarnings } =
        extension === "csv"
          ? parseCsvMatrix(new TextDecoder().decode(buffer))
          : parseXlsxMatrix(buffer);

      // Entendimento inteligente: o parser heurístico tenta primeiro; se o
      // resultado tem cara de layout desestruturado (colunas sem nome,
      // cabeçalho fora do lugar), a IA analisa a grade como um todo e devolve
      // um plano de reestruturação (seções, células mescladas, subtotais,
      // meses em colunas → formato longo). Falhas caem no heurístico.
      let parsed: ParsedFile | null = null;
      let heuristicError: unknown = null;
      let usedAi = false;
      try {
        parsed = buildParsedFromMatrix(matrix, [...parseWarnings]);
      } catch (error) {
        heuristicError = error;
      }
      if (!parsed || looksUnstructured(parsed)) {
        try {
          // Pelo orquestrador: a análise de layout é uma chamada de IA como
          // qualquer outra e precisa passar por crédito, cota e registro.
          const plan = await new AIOrchestrator(ctx).analyzeFileLayout(matrix, fileName);
          if (plan) {
            parsed = applyRestructurePlan(matrix, plan, parseWarnings);
            usedAi = true;
          }
        } catch (error) {
          console.error("[ai-restructure] fallback to heuristic parser", error);
        }
      }
      if (!parsed) throw heuristicError instanceof Error ? heuristicError : new Error("File could not be parsed");

      const plan = await prepareIngest(ctx, admin, fileName, parsed, fileRow.id);

      // A fonte é gravada ANTES de inserir: se o pedido morrer no meio, é por
      // ela que a continuação encontra a tabela para retomar.
      await ctx.supabase
        .from("workspace_files")
        .update({ data_source_id: plan.dataSourceId })
        .eq("id", fileRow.id);

      // A inserção respeita o relógio da função: 300 mil linhas são 150 idas
      // ao banco e não cabem em 60 segundos. O que não couber vira uma
      // continuação — a resposta diz onde parou e o navegador volta para
      // terminar, em vez de o upload morrer a meio caminho.
      //
      // O prazo vale SEMPRE, inclusive no caminho da IA. Antes ele era
      // infinito ali, na esperança de que "planilha remontada pela IA é
      // pequena" — e não é: bastava um separador sobrando no fim das linhas
      // para um arquivo de 150 mil linhas cair nesse caminho. A função era
      // morta aos 60s no meio das inserções, o catch nunca rodava, e o
      // arquivo ficava preso em "processando" para sempre.
      const inserted = await insertRowsFrom(
        admin,
        plan.physicalName,
        plan.rows,
        0,
        startedAt + INGEST_BUDGET_MS
      );

      // A continuação só existe quando a leitura é REPRODUZÍVEL: se o layout
      // foi remontado pela IA, refazer a leitura exigiria refazer a chamada
      // (e o token), e um plano diferente colocaria as linhas fora de ordem.
      // Então aqui a única saída honesta é recusar com o motivo, em vez de
      // deixar uma base pela metade parecendo pronta.
      if (usedAi && inserted < plan.rows.length) {
        throw new Error(
          `Esta planilha precisou ter o layout remontado, e com ${plan.rows.length.toLocaleString("pt-BR")} linhas isso não cabe numa única importação. Exporte os dados como CSV simples (uma linha de cabeçalho e uma linha por registro) e envie de novo.`
        );
      }

      if (inserted < plan.rows.length) {
        return NextResponse.json(
          {
            file: fileRow,
            warnings: parsed.warnings,
            ingest: { fileId: fileRow.id, offset: inserted, total: plan.rows.length },
          },
          { status: 202 }
        );
      }

      await finishIngest(ctx, {
        fileId: fileRow.id,
        tableId: plan.tableId,
        dataSourceId: plan.dataSourceId,
        rowCount: plan.rows.length,
        columnCount: parsed.columns.length,
        physicalName: plan.physicalName,
        dedupedCount: plan.dedupedCount,
        contentHash,
      });

      return NextResponse.json(
        {
          file: { ...fileRow, status: "READY" },
          table: {
            dataSourceId: plan.dataSourceId,
            tableId: plan.tableId,
            physicalName: plan.physicalName,
            rowCount: plan.rows.length,
            dedupedCount: plan.dedupedCount,
          },
          warnings: parsed.warnings,
          // O entendimento continua sendo montado em segundo plano.
          pipelineQueued: true,
        },
        { status: 201 }
      );
    } catch (processError) {
      const message = processError instanceof Error ? processError.message : "Processing failed";
      await ctx.supabase
        .from("workspace_files")
        .update({ status: "ERROR", error: message })
        .eq("id", fileRow.id);
      throw new ApiError(422, message);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
