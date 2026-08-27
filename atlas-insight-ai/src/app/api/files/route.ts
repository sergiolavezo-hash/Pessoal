import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestParsedFile, parseCsv, parseXlsx } from "@/services/file-ingest";

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

      const parsed =
        extension === "csv"
          ? parseCsv(new TextDecoder().decode(buffer))
          : parseXlsx(buffer);

      const result = await ingestParsedFile(ctx, admin, file.name, parsed);

      await ctx.supabase
        .from("workspace_files")
        .update({ status: "READY", storage_path: storagePath, data_source_id: result.dataSourceId })
        .eq("id", fileRow.id);

      await auditLog(ctx, "uploaded_file", "file", fileRow.id, {
        rows: result.rowCount,
        table: result.physicalName,
      });

      return NextResponse.json(
        { file: { ...fileRow, status: "READY" }, table: result, warnings: parsed.warnings },
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
