import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildParsedFromMatrix,
  ingestParsedFile,
  parseCsvMatrix,
  parseXlsxMatrix,
  type ParsedFile,
} from "@/services/file-ingest";
import { analyzeFileLayout, applyRestructurePlan, looksUnstructured } from "@/ai/file-restructure";
import { profileDataSource } from "@/services/profiling";
import { generateSemanticModel } from "@/semantic/generator";

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

    // Track the upload.
    const { data: fileRow, error: fileError } = await ctx.supabase
      .from("workspace_files")
      .insert({
        workspace_id: ctx.workspaceId,
        name: file.name,
        kind: "data",
        mime_type: file.type || null,
        size_bytes: file.size,
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
      const buffer = await file.arrayBuffer();
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
          const plan = await analyzeFileLayout(matrix, file.name);
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

      await auditLog(ctx, "uploaded_file", "file", fileRow.id, {
        rows: result.rowCount,
        deduped: result.dedupedCount,
        table: result.physicalName,
      });

      // Piloto automático: depois do upload, a inteligência roda sozinha —
      // perfil das colunas, detecção de relacionamentos e modelo semântico.
      // Cada etapa é best-effort: falhas não invalidam o upload.
      const pipeline: { profiled: boolean; relationships: number; semanticModel: boolean } = {
        profiled: false,
        relationships: 0,
        semanticModel: false,
      };
      try {
        const prof = await profileDataSource(ctx, result.dataSourceId);
        pipeline.profiled = true;
        pipeline.relationships =
          (prof as { relationships?: number } | undefined)?.relationships ?? 0;
      } catch (error) {
        console.error("[auto-pipeline] profiling", error);
      }
      try {
        await generateSemanticModel(ctx, result.dataSourceId);
        pipeline.semanticModel = true;
      } catch (error) {
        console.error("[auto-pipeline] semantic model", error);
      }

      return NextResponse.json(
        { file: { ...fileRow, status: "READY" }, table: result, warnings: parsed.warnings, pipeline },
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
