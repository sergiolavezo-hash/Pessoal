import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { fileTableName } from "@/services/data-sources";
import {
  PREP_COLUMN_TYPES,
  validateColumnName,
  validateComputedExpression,
} from "@/services/data-prep";

type Params = { params: Promise<{ tableId: string }> };

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("toggle_exclude"),
    workspaceId: z.string().uuid(),
    columnId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("add_column"),
    workspaceId: z.string().uuid(),
    name: z.string().min(1).max(60),
    type: z.enum(PREP_COLUMN_TYPES),
    expression: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("drop_column"),
    workspaceId: z.string().uuid(),
    columnId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("rename_column"),
    workspaceId: z.string().uuid(),
    columnId: z.string().uuid(),
    newName: z.string().min(1).max(60),
  }),
]);

/** Transformações estilo Power Query sobre uma tabela catalogada. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { tableId } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const { data: table } = await ctx.supabase
      .from("catalog_tables")
      .select("id, name, dataset_id, datasets(data_source_id, data_sources(type))")
      .eq("id", tableId)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();
    if (!table) throw new ApiError(404, "Table not found");

    const dataset = table.datasets as unknown as {
      data_source_id: string;
      data_sources: { type: string } | null;
    } | null;
    const isFile = dataset?.data_sources?.type === "file";

    const { data: columnRows } = await ctx.supabase
      .from("catalog_columns")
      .select("id, name, data_type, excluded")
      .eq("table_id", tableId)
      .order("ordinal");
    const columns = columnRows ?? [];
    const physicalName = fileTableName(tableId);
    const admin = createAdminClient();

    switch (body.action) {
      case "toggle_exclude": {
        const col = columns.find((c) => c.id === body.columnId);
        if (!col) throw new ApiError(404, "Column not found");
        const { error } = await ctx.supabase
          .from("catalog_columns")
          .update({ excluded: !col.excluded })
          .eq("id", col.id);
        if (error) throw new ApiError(500, error.message);
        await auditLog(ctx, col.excluded ? "included_column" : "excluded_column", "column", col.id, {
          table: table.name,
          column: col.name,
        });
        return NextResponse.json({ ok: true, excluded: !col.excluded });
      }

      case "add_column": {
        if (!isFile) throw new ApiError(422, "Computed columns are only supported on file tables for now.");
        const name = body.name.trim().toLowerCase();
        const nameCheck = validateColumnName(name);
        if (!nameCheck.ok) throw new ApiError(422, nameCheck.reason!);
        if (columns.some((c) => c.name === name)) {
          throw new ApiError(422, `Column "${name}" already exists.`);
        }
        const exprCheck = validateComputedExpression(
          body.expression,
          columns.map((c) => c.name)
        );
        if (!exprCheck.ok) throw new ApiError(422, exprCheck.reason!);

        const { error: rpcError } = await admin.rpc("add_file_computed_column", {
          p_table_name: physicalName,
          p_column_name: name,
          p_type: body.type,
          p_expression: body.expression,
        });
        if (rpcError) {
          throw new ApiError(422, `A expressão falhou no banco: ${rpcError.message}`);
        }
        const { error } = await ctx.supabase.from("catalog_columns").insert({
          workspace_id: ctx.workspaceId,
          table_id: tableId,
          name,
          data_type: body.type,
          ordinal: columns.length + 1,
          expression: body.expression,
        });
        if (error) throw new ApiError(500, error.message);
        await auditLog(ctx, "added_computed_column", "column", name, {
          table: table.name,
          expression: body.expression,
        });
        return NextResponse.json({ ok: true });
      }

      case "drop_column": {
        if (!isFile) throw new ApiError(422, "Dropping columns is only supported on file tables for now.");
        const col = columns.find((c) => c.id === body.columnId);
        if (!col) throw new ApiError(404, "Column not found");
        if (columns.length <= 1) throw new ApiError(422, "A table needs at least one column.");
        const { error: rpcError } = await admin.rpc("drop_file_column", {
          p_table_name: physicalName,
          p_column_name: col.name,
        });
        if (rpcError) throw new ApiError(422, rpcError.message);
        await ctx.supabase.from("catalog_columns").delete().eq("id", col.id);
        await auditLog(ctx, "dropped_column", "column", col.id, { table: table.name, column: col.name });
        return NextResponse.json({ ok: true });
      }

      case "rename_column": {
        if (!isFile) throw new ApiError(422, "Renaming columns is only supported on file tables for now.");
        const col = columns.find((c) => c.id === body.columnId);
        if (!col) throw new ApiError(404, "Column not found");
        const newName = body.newName.trim().toLowerCase();
        const nameCheck = validateColumnName(newName);
        if (!nameCheck.ok) throw new ApiError(422, nameCheck.reason!);
        if (columns.some((c) => c.name === newName)) {
          throw new ApiError(422, `Column "${newName}" already exists.`);
        }
        const { error: rpcError } = await admin.rpc("rename_file_column", {
          p_table_name: physicalName,
          p_old: col.name,
          p_new: newName,
        });
        if (rpcError) throw new ApiError(422, rpcError.message);
        await ctx.supabase.from("catalog_columns").update({ name: newName }).eq("id", col.id);
        await auditLog(ctx, "renamed_column", "column", col.id, {
          table: table.name,
          from: col.name,
          to: newName,
        });
        return NextResponse.json({ ok: true });
      }
    }
  } catch (error) {
    return handleApiError(error);
  }
}
