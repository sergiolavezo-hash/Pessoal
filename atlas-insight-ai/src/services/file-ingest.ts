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
const FLOAT_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const BOOL_VALUES = new Set(["true", "false", "yes", "no", "0", "1", "sim", "não", "nao"]);

/**
 * Normaliza números "de gente": R$ 1.234,56 / 1.234,56 / (123,45) / 2,75.
 * Retorna a forma canônica com ponto decimal, ou null se não for número.
 */
export function normalizeNumericString(raw: string): string | null {
  let s = raw.trim().replace(/^(r\$|us\$|\$|€)\s*/i, "");
  let negative = false;
  const paren = s.match(/^\((.+)\)$/);
  if (paren) {
    negative = true;
    s = paren[1].trim();
  }
  s = s.replace(/\s/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // O último separador é o decimal; o outro é milhar.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replaceAll(".", "").replace(",", ".");
    else s = s.replaceAll(",", "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  if (!FLOAT_RE.test(s)) return null;
  return negative ? `-${s}` : s;
}

export function inferColumnType(values: unknown[]): InferredType {
  const nonNull = values.filter((v) => v != null && String(v).trim() !== "").map((v) => String(v).trim());
  if (nonNull.length === 0) return "text";

  const check = (pred: (v: string) => boolean) => nonNull.every(pred);

  if (check((v) => INT_RE.test(v))) return "bigint";
  if (check((v) => normalizeNumericString(v) != null)) return "double precision";
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
      return Number.parseFloat(normalizeNumericString(s) ?? s.replace(",", "."));
    case "boolean":
      return ["true", "yes", "1", "sim"].includes(s.toLowerCase());
    case "date":
    case "timestamptz":
      return s;
    default:
      return s;
  }
}

export interface ParsedMatrix {
  matrix: unknown[][];
  warnings: string[];
}

export function parseCsvMatrix(content: string): ParsedMatrix {
  const result = Papa.parse<string[]>(content, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  });
  const warnings = result.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`);
  return { matrix: result.data as unknown[][], warnings };
}

export function parseXlsxMatrix(buffer: ArrayBuffer): ParsedMatrix {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets");
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const warnings = workbook.SheetNames.length > 1
    ? [`Workbook has ${workbook.SheetNames.length} sheets; only "${sheetName}" was imported.`]
    : [];
  return { matrix, warnings };
}

export function parseCsv(content: string): ParsedFile {
  const { matrix, warnings } = parseCsvMatrix(content);
  return buildParsedFromMatrix(matrix, warnings);
}

export function parseXlsx(buffer: ArrayBuffer): ParsedFile {
  const { matrix, warnings } = parseXlsxMatrix(buffer);
  return buildParsedFromMatrix(matrix, warnings);
}

/**
 * Detecta a linha de cabeçalho em planilhas "de gente": títulos, linhas em
 * branco e células soltas acima do cabeçalho real são ignorados. A melhor
 * candidata é a linha com mais células preenchidas, únicas e textuais,
 * seguida por linhas densas de dados.
 */
export function detectHeaderRow(matrix: unknown[][]): number {
  const limit = Math.min(matrix.length, 20);
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < limit; i++) {
    const cells = (matrix[i] ?? []).map((v) => (v == null ? "" : String(v).trim()));
    const nonEmpty = cells.filter(Boolean);
    if (nonEmpty.length < 2) continue;
    const unique = new Set(nonEmpty.map((c) => c.toLowerCase())).size;
    const textish = nonEmpty.filter((c) => !/^-?\d+([.,]\d+)?$/.test(c)).length;
    const below = matrix.slice(i + 1, i + 6);
    const belowFill =
      below.length === 0
        ? 0
        : below.reduce(
            (acc, r) => acc + (r ?? []).filter((v) => v != null && String(v).trim() !== "").length,
            0
          ) /
          (below.length * Math.max(nonEmpty.length, 1));
    const score = nonEmpty.length * 2 + unique + textish * 1.5 + belowFill * 10 - i * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/**
 * Rótulos de linha de fechamento. Somar uma tabela que contém a própria
 * soma dobra todo indicador — e quando a IA não está disponível, ninguém
 * mais remove essas linhas.
 */
const TOTAL_ROW_RE = /^(total|subtotal|soma|totais|% ?sobre|percentual)\b/i;

function looksLikeTotalRow(cells: string[]): boolean {
  const filled = cells.filter(Boolean);
  if (filled.length === 0) return false;
  // Linha de fechamento tem poucos rótulos e um deles anuncia o total.
  return filled.some((c) => TOTAL_ROW_RE.test(c));
}

export function buildParsedFromMatrix(matrix: unknown[][], warnings: string[]): ParsedFile {
  const meaningful = matrix.filter((r) => (r ?? []).some((v) => v != null && String(v).trim() !== ""));
  if (meaningful.length === 0) throw new Error("File has no data rows");

  const headerIndex = detectHeaderRow(matrix);
  if (headerIndex > 0) {
    warnings.push(
      `Header detected at row ${headerIndex + 1}; ${headerIndex} title/blank row(s) above were ignored.`
    );
  }
  const headerCells = (matrix[headerIndex] ?? []).map((v) => (v == null ? "" : String(v).trim()));
  const dataRows = matrix
    .slice(headerIndex + 1)
    .filter((r) => (r ?? []).some((v) => v != null && String(v).trim() !== ""));
  if (dataRows.length === 0) throw new Error("File has no data rows");

  // Mantém apenas colunas com cabeçalho OU dados (descarta colunas vazias).
  const colCount = Math.max(headerCells.length, ...dataRows.map((r) => (r ?? []).length));
  const kept: number[] = [];
  for (let j = 0; j < colCount; j++) {
    const hasHeader = Boolean(headerCells[j]);
    const hasData = dataRows.some((r) => r?.[j] != null && String(r[j]).trim() !== "");
    if (hasHeader || hasData) kept.push(j);
  }
  const dropped = colCount - kept.length;
  if (dropped > 0) warnings.push(`${dropped} empty column(s) were removed automatically.`);
  if (kept.length === 0) throw new Error("No header row found");

  const rawHeaders = kept.map((j, k) => headerCells[j] || `coluna_${k + 1}`);

  const keptRows = dataRows.filter(
    (r) => !looksLikeTotalRow(kept.map((j) => (r?.[j] == null ? "" : String(r[j]).trim())))
  );
  const removedTotals = dataRows.length - keptRows.length;
  if (removedTotals > 0) {
    warnings.push(
      `${removedTotals} linha(s) de total/subtotal foram removidas para não somar os mesmos valores duas vezes.`
    );
  }
  if (keptRows.length === 0) throw new Error("File has no data rows");

  return buildParsed(
    rawHeaders,
    keptRows.map((r) => {
      const obj: Record<string, unknown> = {};
      kept.forEach((j, k) => {
        obj[`__col_${k}`] = r?.[j] ?? null;
      });
      return obj;
    }),
    warnings,
    kept.map((_, k) => `__col_${k}`)
  );
}

export function buildParsed(
  headers: string[],
  data: Record<string, unknown>[],
  warnings: string[],
  keys?: string[]
): ParsedFile {
  if (headers.length === 0) throw new Error("No header row found");
  if (data.length === 0) throw new Error("File has no data rows");
  if (data.length > MAX_ROWS) {
    warnings.push(`File has ${data.length} rows; only the first ${MAX_ROWS} were imported.`);
    data = data.slice(0, MAX_ROWS);
  }

  const used = new Set<string>();
  const columns = headers.map((h, i) => {
    // `keys` maps each header to the positional key used in the data objects
    // (headers can repeat or be blank; positional keys are always unique).
    const original = keys?.[i] ?? h;
    const name = sanitizeColumnName(h, i, used);
    const sample = data.slice(0, 500).map((r) => r[original]);
    let type = inferColumnType(sample);

    // Uma célula de texto solta ("Total", "n/d") não pode transformar uma
    // coluna de dinheiro inteira em texto — ela deixaria de virar indicador.
    if (type === "text") {
      const present = sample
        .filter((v) => v != null && String(v).trim() !== "")
        .map((v) => String(v).trim());
      const numeric = present.filter((v) => normalizeNumericString(v) != null).length;
      if (present.length >= 3 && numeric / present.length >= 0.7) {
        type = "double precision";
        warnings.push(
          `Coluna "${h}": ${present.length - numeric} valor(es) de texto ignorados para manter a coluna numérica.`
        );
      }
    }
    return { original, name, type };
  });

  const rows = data.map((r) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = r[col.original];
      // Texto numa coluna numérica vira vazio, não zero: zero mentiria na soma.
      if (col.type === "double precision" && raw != null && String(raw).trim() !== "") {
        out[col.name] = normalizeNumericString(String(raw)) == null
          ? null
          : coerceValue(raw, col.type);
        continue;
      }
      out[col.name] = coerceValue(raw, col.type);
    }
    return out;
  });

  return { columns: columns.map(({ name, type }) => ({ name, type })), rows, warnings };
}

// Colunas genéricas demais para indicar afinidade de assunto entre tabelas
// (usadas na atribuição automática de contexto de análise).
const GENERIC_CONTEXT_COLUMNS = new Set([
  "id", "nome", "name", "status", "data", "date", "descricao", "description",
  "valor", "value", "tipo", "type", "ativo", "active", "email",
  "created_at", "updated_at", "quantidade", "qtd", "total", "obs", "observacao",
]);

function isGenericColumn(name: string): boolean {
  const n = name.toLowerCase();
  return GENERIC_CONTEXT_COLUMNS.has(n) || /^col(una)?_\d+/.test(n);
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
): Promise<{ dataSourceId: string; tableId: string; physicalName: string; rowCount: number; dedupedCount: number }> {
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
        name: "Arquivos enviados",
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

  // Camada ouro: deduplicação automática de linhas idênticas na ingestão.
  // O usuário recebe dados prontos para análise sem duplicatas exatas.
  const uniqueRows: Record<string, unknown>[] = [];
  const seenRows = new Set<string>();
  for (const row of parsed.rows) {
    const key = JSON.stringify(row);
    if (seenRows.has(key)) continue;
    seenRows.add(key);
    uniqueRows.push(row);
  }
  const dedupedCount = parsed.rows.length - uniqueRows.length;
  if (dedupedCount > 0) {
    parsed = { ...parsed, rows: uniqueRows };
    await ctx.supabase
      .from("catalog_tables")
      .update({ row_count: uniqueRows.length })
      .eq("id", tableRow.id);
  }

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

  // 6. Contexto de análise (estilo Looker): tabelas que compartilham colunas
  // não genéricas pertencem ao mesmo assunto; caso contrário o upload vira um
  // contexto próprio. O usuário pode analisar cada contexto em separado ou
  // todos juntos ao gerar um dashboard.
  const { data: siblings, error: sibError } = await ctx.supabase
    .from("catalog_tables")
    .select("id, name, context, catalog_columns(name)")
    .eq("dataset_id", dataset.id)
    .neq("id", tableRow.id);
  if (!sibError) {
    const myColumns = new Set(
      parsed.columns.map((c) => c.name.toLowerCase()).filter((n) => !isGenericColumn(n))
    );
    let context = logicalName;
    for (const sibling of siblings ?? []) {
      const siblingColumns = (sibling.catalog_columns ?? []) as Array<{ name: string }>;
      const shared = siblingColumns.some(
        (c) => myColumns.has(c.name.toLowerCase()) && !isGenericColumn(c.name)
      );
      if (shared) {
        context = (sibling.context as string | null) ?? (sibling.name as string);
        break;
      }
    }
    // Ignora falha silenciosamente: a coluna `context` só existe após a 0011.
    await ctx.supabase.from("catalog_tables").update({ context }).eq("id", tableRow.id);
  }

  return { dataSourceId, tableId: tableRow.id, physicalName, rowCount: parsed.rows.length, dedupedCount };
}
