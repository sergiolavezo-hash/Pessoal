import "server-only";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";
import { fileTableName } from "@/services/data-sources";
import type { ApiContext } from "@/services/api-context";

const MAX_ROWS = 500_000;
const INSERT_BATCH = 1_000;

export type InferredType = "text" | "bigint" | "double precision" | "boolean" | "timestamptz" | "date";

export interface ParsedFile {
  columns: Array<{ name: string; type: InferredType }>;
  rows: Record<string, unknown>[];
  warnings: string[];
}

const RESERVED = new Set(["select", "from", "where", "group", "order", "table", "user", "index", "limit"]);

export function sanitizeColumnName(raw: string, index: number, used: Set<string>): string {
  let name = slugify(String(raw ?? "").trim()).replaceAll("-", "_");
  if (!name || /^\d/.test(name)) name = `col_${index + 1}${name ? `_${name}` : ""}`;
  if (RESERVED.has(name)) name = `${name}_col`;
  name = name.slice(0, 60);
  let candidate = name;
  let n = 2;
  while (used.has(candidate)) candidate = `${name}_${n++}`;
  used.add(candidate);
  return candidate;
}

const INT_RE = /^-?\d{1,18}$/;
const FLOAT_RE = /^-?\d+([.,]\d+)?([eE][+-]?\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const BOOL_VALUES = new Set(["true", "false", "yes", "no", "0", "1", "sim", "não", "nao"]);

export function inferColumnType(values: unknown[]): InferredType {
  const nonNull = values.filter((v) => v != null && String(v).trim() !== "").map((v) => String(v).trim());
  if (nonNull.length === 0) return "text";

  const check = (pred: (v: string) => boolean) => nonNull.every(pred);

  if (check((v) => INT_RE.test(v))) return "bigint";
  if (check((v) => FLOAT_RE.test(v.replace(",", ".")))) return "double precision";
  if (check((v) => BOOL_VALUES.has(v.toLowerCase())) && new Set(nonNull.map((v) => v.toLowerCase())).size <= 2)
    return "boolean";
  if (check((v) => DATE_RE.test(v))) return "date";
  if (check((v) => DATETIME_RE.test(v) && !Number.isNaN(Date.parse(v)))) return "timestamptz";
  return "text";
}

export function coerceValue(value: unknown, type: InferredType): unknown {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  switch (type) {
    case "bigint":
      return Number.parseInt(s, 10);
    case "double precision":
      return Number.parseFloat(s.replace(",", "."));
    case "boolean":
      return ["true", "yes", "1", "sim"].includes(s.toLowerCase());
    case "date":
    case "timestamptz":
      return s;
    default:
      return s;
  }
}

export function parseCsv(content: string): ParsedFile {
  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });
  const warnings = result.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`);
  return buildParsed(result.meta.fields ?? [], result.data, warnings);
}

export function parseXlsx(buffer: ArrayBuffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets");
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  const warnings = workbook.SheetNames.length > 1
    ? [`Workbook has ${workbook.SheetNames.length} sheets; only "${sheetName}" was imported.`]
    : [];
  return buildParsed(headers, json, warnings);
}

function buildParsed(headers: string[], data: Record<string, unknown>[], warnings: string[]): ParsedFile {
  if (headers.length === 0) throw new Error("No header row found");
  if (data.length === 0) throw new Error("File has no data rows");
  if (data.length > MAX_ROWS) {
    warnings.push(`File has ${data.length} rows; only the first ${MAX_ROWS} were imported.`);
    data = data.slice(0, MAX_ROWS);
  }

  const used = new Set<string>();
  const columns = headers.map((h, i) => {
    const name = sanitizeColumnName(h, i, used);
    const sample = data.slice(0, 500).map((r) => r[h]);
    return { original: h, name, type: inferColumnType(sample) };
  });

  const rows = data.map((r) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) out[col.name] = coerceValue(r[col.original], col.type);
    return out;
  });

  return { columns: columns.map(({ name, type }) => ({ name, type })), rows, warnings };
}

/**
 * Materializes a parsed file as a physical Postgres table and registers it
 * in the catalog under the workspace's "Files" data source.
 */
export async function ingestParsedFile(
  ctx: ApiContext,
  admin: SupabaseClient,
  fileName: string,
  parsed: ParsedFile
): Promise<{ dataSourceId: string; tableId: string; physicalName: string; rowCount: number }> {
  // 1. Find or create the workspace's file data source.
  const { data: existing } = await ctx.supabase
    .from("data_sources")
    .select("id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("type", "file")
    .is("deleted_at", null)
    .maybeSingle();

  let dataSourceId: string | undefined = existing?.id;
  if (!dataSourceId) {
    const { data: created, error } = await ctx.supabase
      .from("data_sources")
      .insert({
        workspace_id: ctx.workspaceId,
        name: "Uploaded Files",
        type: "file",
        status: "CONNECTED",
        created_by: ctx.user.id,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Failed to create file data source");
    dataSourceId = created.id;
  }
  if (!dataSourceId) throw new Error("Failed to resolve file data source");

  // 2. Dataset "files".
  const { data: dataset, error: dsError } = await ctx.supabase
    .from("datasets")
    .upsert(
      { workspace_id: ctx.workspaceId, data_source_id: dataSourceId, name: "files" },
      { onConflict: "data_source_id,name" }
    )
    .select("id")
    .single();
  if (dsError || !dataset) throw new Error(dsError?.message ?? "Failed to create dataset");

  // 3. Catalog table (logical name derived from the file name).
  const used = new Set<string>();
  const logicalName = sanitizeColumnName(fileName.replace(/\.[^.]+$/, ""), 0, used);
  const { data: tableRow, error: tError } = await ctx.supabase
    .from("catalog_tables")
    .upsert(
      { workspace_id: ctx.workspaceId, dataset_id: dataset.id, name: logicalName, row_count: parsed.rows.length },
      { onConflict: "dataset_id,name" }
    )
    .select("id")
    .single();
  if (tError || !tableRow) throw new Error(tError?.message ?? "Failed to register table");

  const physicalName = fileTableName(tableRow.id);

  // Proteção de performance: arquivos gigantes degradam o motor de
  // consultas — acima do teto, oriente conectar o banco de origem.
  const MAX_FILE_ROWS = 200_000;
  if (parsed.rows.length > MAX_FILE_ROWS) {
    throw new Error(
      `File has ${parsed.rows.length.toLocaleString()} rows — the limit for file uploads is ${MAX_FILE_ROWS.toLocaleString()}. For large data, connect the source database (PostgreSQL/SQL Server/BigQuery) instead: queries run at the source and stay fast.`
    );
  }

  // Atualização garantida: re-enviar um arquivo com o MESMO nome substitui
  // os dados anteriores (drop + recreate), refletindo a origem atualizada.
  await admin.rpc("drop_file_table", { p_table_name: physicalName });
  await ctx.supabase.from("catalog_columns").delete().eq("table_id", tableRow.id);

  // 4. Physical table + rows (service role RPCs; see migration 0006).
  const { error: createError } = await admin.rpc("create_file_table", {
    p_table_name: physicalName,
    p_columns: parsed.columns,
  });
  if (createError) throw new Error(`Failed to create table: ${createError.message}`);

  for (let i = 0; i < parsed.rows.length; i += INSERT_BATCH) {
    const batch = parsed.rows.slice(i, i + INSERT_BATCH);
    const { error: insertError } = await admin.rpc("insert_file_rows", {
      p_table_name: physicalName,
      p_rows: batch,
    });
    if (insertError) throw new Error(`Failed to insert rows: ${insertError.message}`);
  }

  // 5. Catalog columns.
  for (let i = 0; i < parsed.columns.length; i++) {
    const col = parsed.columns[i];
    const { error: cError } = await ctx.supabase.from("catalog_columns").upsert(
      {
        workspace_id: ctx.workspaceId,
        table_id: tableRow.id,
        name: col.name,
        data_type: col.type,
        ordinal: i + 1,
        nullable: true,
      },
      { onConflict: "table_id,name" }
    );
    if (cError) throw new Error(cError.message);
  }

  return { dataSourceId, tableId: tableRow.id, physicalName, rowCount: parsed.rows.length };
}
