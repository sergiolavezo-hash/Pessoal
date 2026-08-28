import { NextResponse, after, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildParsedFromMatrix,
  ingestParsedFile,
  parseCsvMatrix,
  parseXlsxMatrix,
  type ParsedFile,
} from "@/services/file-ingest";
import { applyRestructurePlan, looksUnstructured } from "@/ai/file-restructure";
import { AIOrchestrator } from "@/ai/orchestrator";
import { profileDataSource } from "@/services/profiling";
import { generateSemanticModel } from "@/semantic/generator";
import { findDuplicate, hashFileContent, invalidateAiCache } from "@/services/file-dedup";
import { publishRevision } from "@/services/datasets";
import { buildWorkspaceContext } from "@/ai/context";
import { scoreDataset } from "@/ai/dataset-quality";
import { minDatasetQualityScore } from "@/ai/config";

export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = new Set(["csv", "xlsx", "xls"]);

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const workspaceId = formData.get("workspaceId");
    const file = formData.get("file");

    if (typeof workspaceId !== "string") throw new ApiError(400, "workspaceId is required");
    if (!(file instanceof File)) throw new ApiError(400, "file is required");

    const ctx = await requireWorkspace(workspaceId, "EDITOR");

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new ApiError(400, `Unsupported file type ".${extension}". Upload CSV or XLSX.`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ApiError(400, `File exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB limit`);
    }

    const admin = createAdminClient();

    // Impressão digital do conteúdo antes de qualquer processamento: o mesmo
    // arquivo reenviado refazia parse, perfil, modelo semântico e — quando o
    // layout parecia bagunçado — uma chamada de IA, para chegar ao dataset que
    // já existia. Comparar o hash custa milissegundos e evita tudo isso.
    const buffer = await file.arrayBuffer();
    const contentHash = hashFileContent(buffer);
    const duplicate = await findDuplicate(ctx.workspaceId, contentHash);
    if (duplicate) {
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
        name: file.name,
        kind: "data",
        mime_type: file.type || null,
        size_bytes: file.size,
        content_hash: contentHash,
        storage_path: `${ctx.workspaceId}/pending/${file.name}`,
        status: "PROCESSING",
        uploaded_by: ctx.user.id,
      })
      .select()
      .single();
    if (fileError || !fileRow) throw new ApiError(500, fileError?.message ?? "Failed to record file");

    try {
      // Keep the raw file in Storage for reprocessing/audit.
      const storagePath = `${ctx.workspaceId}/${fileRow.id}/${file.name}`;
      const { error: uploadError } = await admin.storage
        .from("workspace-files")
        .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

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
      try {
        parsed = buildParsedFromMatrix(matrix, [...parseWarnings]);
      } catch (error) {
        heuristicError = error;
      }
      if (!parsed || looksUnstructured(parsed)) {
        try {
          // Pelo orquestrador: a análise de layout é uma chamada de IA como
          // qualquer outra e precisa passar por crédito, cota e registro.
          const plan = await new AIOrchestrator(ctx).analyzeFileLayout(matrix, file.name);
          if (plan) parsed = applyRestructurePlan(matrix, plan, parseWarnings);
        } catch (error) {
          console.error("[ai-restructure] fallback to heuristic parser", error);
        }
      }
      if (!parsed) throw heuristicError instanceof Error ? heuristicError : new Error("File could not be parsed");

      const result = await ingestParsedFile(ctx, admin, file.name, parsed);

      await ctx.supabase
        .from("workspace_files")
        .update({ status: "READY", storage_path: storagePath, data_source_id: result.dataSourceId })
        .eq("id", fileRow.id);

      // Dados novos tornam as respostas guardadas obsoletas: o cache expira
      // por tempo, mas não sabe que a base mudou.
      await invalidateAiCache(ctx.workspaceId);

      await auditLog(ctx, "uploaded_file", "file", fileRow.id, {
        rows: result.rowCount,
        deduped: result.dedupedCount,
        table: result.physicalName,
      });

      // Piloto automático: perfil das colunas, relacionamentos e modelo
      // semântico rodam DEPOIS da resposta. Antes eles ficavam no caminho do
      // pedido e, somados à leitura por IA, estouravam o tempo da função — o
      // upload morria e o arquivo ficava preso em "processando".
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
        // A nota de qualidade só faz sentido depois do perfil: é dele que
        // saem papéis das colunas, vazios e contagens. Publicar aqui é o que
        // torna o portão real — uma base reprovada fica visível com o motivo,
        // em vez de virar um painel de gráficos em branco.
        try {
          const context = await buildWorkspaceContext(ctx, result.dataSourceId);
          const quality = scoreDataset(context);
          await publishRevision(ctx.supabase, result.dataSourceId, {
            score: quality.score,
            problems: quality.problems,
            rowCount: result.rowCount,
            columnCount: parsed.columns.length,
            contentHash,
            minScore: minDatasetQualityScore(),
          });
        } catch (error) {
          console.error("[auto-pipeline] publish revision", error);
        }
      });

      return NextResponse.json(
        {
          file: { ...fileRow, status: "READY" },
          table: result,
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
