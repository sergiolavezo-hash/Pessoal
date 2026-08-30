import "server-only";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";
import { fileTableName } from "@/services/data-sources";
import { maxOf } from "@/lib/extremes";
import { describeDayMonth, detectDateFormat, toIsoDate, type DateFormat } from "@/services/dates";
import type { ApiContext } from "@/services/api-context";

/**
 * Linhas por chamada ao banco.
 *
 * O gargalo da ingestão não é ler o arquivo — medido num CSV de 22 MB com
 * 306 mil linhas, parse e deduplicação juntos levam menos de 1 segundo. O
 * custo está nas IDAS AO BANCO: com lotes de mil, o mesmo arquivo faz 307
 * chamadas de rede e estoura o tempo da função. Dois mil por lote dá ~360 KB
 * de JSON por chamada — grande o bastante para cortar as idas pela metade e
 * pequeno o bastante para não travar num pedido lento.
 */
const INSERT_BATCH = 2_000;

/**
 * Teto de linhas por arquivo. UM número, cobrado em UM lugar.
 *
 * Havia dois, e o de cima era invisível: a leitura CORTAVA em 500 mil linhas e
 * só empurrava um aviso, então o teto de baixo (que recusava o arquivo e
 * mandava conectar o banco de origem) nunca chegava a disparar. Uma base de
 * 700 mil linhas entrava com 500 mil, marcada como pronta, e o cliente montava
 * painel sobre 71% dos dados achando que tinha tudo — o único sinal era um
 * aviso amarelo no meio de outros, depois de um aviso VERDE dizendo que deu
 * certo. Perder dado do cliente em silêncio é pior do que recusar o arquivo.
 *
 * O limite é de MEMÓRIA, não de tempo: a ingestão em fatias resolveu o tempo,
 * mas o arquivo inteiro ainda é carregado para ser lido. Medido num CSV real,
 * cada linha custa cerca de 1,2 KB de heap — 500 mil linhas ficam perto de
 * 600 MB, que é o que dá para sustentar dentro da função.
 */
export const MAX_FILE_ROWS = 500_000;

/** A recusa, escrita uma vez só para os dois pontos que a aplicam. */
export function tooManyRowsMessage(rows: number): string {
  return `O arquivo tem ${rows.toLocaleString("pt-BR")} linhas e o limite por upload é ${MAX_FILE_ROWS.toLocaleString("pt-BR")}. Nada foi importado pela metade. Para bases maiores, conecte o banco de origem (PostgreSQL/SQL Server/BigQuery): a consulta roda na fonte e continua rápida.`;
}

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

  // Data escrita como gente escreve: dd/mm/aaaa, mm/dd/aaaa, dd-mm-aaaa, com
  // ou sem hora. Sem isto a coluna virava texto, e como o papel DATE é
  // atribuído pelo TIPO, a base inteira ficava "sem evolução no tempo".
  const format = detectDateFormat(nonNull);
  if (format) return format.withTime ? "timestamptz" : "date";

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
  // Sem espalhar em argumentos: uma linha por argumento estoura a pilha do V8
  // acima de ~125 mil linhas, que é o tamanho de arquivo que este produto
  // existe para analisar. Ver src/lib/extremes.ts.
  const colCount = Math.max(
    headerCells.length,
    maxOf(dataRows.map((r) => (r ?? []).length)) ?? 0
  );
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
  // Recusa, não corte. Ver MAX_FILE_ROWS.
  if (data.length > MAX_FILE_ROWS) throw new Error(tooManyRowsMessage(data.length));

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
    // O formato é decidido uma vez, olhando a coluna inteira — nunca valor a
    // valor. "01/02/2020" sozinho é ambíguo; a coluna quase nunca é.
    let dateFormat: DateFormat | null = null;
    if (type === "date" || type === "timestamptz") {
      const all = data.map((r) => r[original]);
      dateFormat = detectDateFormat(all);
      if (dateFormat?.ambiguous) {
        warnings.push(
          `Coluna "${h}": não deu para saber se o primeiro número é o dia ou o mês, e foi lida como ${describeDayMonth(dateFormat.dayMonth)}. Se estiver trocado, corrija o modelo antes de gerar painéis.`
        );
      }
    }
    return { original, name, type, dateFormat };
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
      // Data vai para o banco em ISO: é o que o Postgres aceita sem depender
      // de locale, e é o que permite ordenar e agrupar por período.
      if (col.dateFormat) {
        out[col.name] = toIsoDate(raw, col.dateFormat);
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
 * Camada ouro: remove linhas idênticas na ingestão, preservando a ordem.
 *
 * Precisa ser DETERMINÍSTICA e viver num lugar só: a continuação de um
 * arquivo grande refaz esta lista para descobrir onde parou, e duas versões
 * ligeiramente diferentes desta regra fariam a retomada apontar para a linha
 * errada — dado duplicado ou dado faltando na base do cliente.
 */
/**
 * Nome lógico da tabela de um arquivo.
 *
 * É daqui que sai a tabela física, então quem precisar saber se dois arquivos
 * disputam o mesmo destino tem de perguntar a ESTA função — comparar o nome do
 * arquivo não serve: "Vendas 2024.csv" e "vendas-2024.xlsx" são nomes
 * diferentes e o mesmo destino.
 */
export function logicalTableName(fileName: string): string {
  return sanitizeColumnName(fileName.replace(/\.[^.]+$/, ""), 0, new Set<string>());
}

/**
 * Primeiro nome livre a partir de `base`: base, base_2, base_3...
 *
 * Existe porque dois arquivos de nomes diferentes podem cair no MESMO nome
 * normalizado, e a tabela física vem dele. Sem desempatar, o segundo arquivo
 * derruba a tabela do primeiro e o cliente passa a ler, num painel antigo,
 * dados de outra planilha — sem aviso nenhum.
 */
export function firstFreeTableName(base: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}_${n}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error(`Não há nome de tabela livre para "${base}".`);
}

export function dedupeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const unique: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

/** Coluna ausente = migração 0021 pendente; não pode travar upload nenhum. */
function isMissingOwnershipColumn(error: { code?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

/**
 * Nome da tabela para este arquivo, respeitando quem já é dono do quê.
 *
 * Três casos: (1) este mesmo arquivo já tem tabela — reusa, que é a
 * substituição desejada ao reenviar; (2) o nome está livre — usa; (3) outro
 * arquivo já ocupa o nome — pega o próximo livre, em vez de derrubar a tabela
 * dele. Sem a 0021 aplicada, cai no comportamento antigo (só o nome), porque
 * recusar upload por causa de migração pendente seria pior.
 */
async function resolveTableName(
  ctx: ApiContext,
  datasetId: string,
  fileName: string
): Promise<string> {
  const base = logicalTableName(fileName);

  const { data: owners, error } = await ctx.supabase
    .from("workspace_files")
    .select("name, catalog_table_id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("status", "READY")
    .not("catalog_table_id", "is", null);

  if (error) {
    if (!isMissingOwnershipColumn(error)) {
      console.warn(`[file-ingest] posse de tabela não pôde ser lida: ${error.message}`);
    }
    return base;
  }
  if (!owners || owners.length === 0) return base;

  const ids = [...new Set(owners.map((o) => o.catalog_table_id as string))];
  const { data: tables } = await ctx.supabase
    .from("catalog_tables")
    .select("id, name")
    .eq("dataset_id", datasetId)
    .in("id", ids);

  const nameById = new Map((tables ?? []).map((t) => [t.id as string, t.name as string]));
  const taken: string[] = [];
  for (const owner of owners) {
    const tableName = nameById.get(owner.catalog_table_id as string);
    if (!tableName) continue;
    // O próprio arquivo: reenviar substitui, é o que o usuário espera.
    if (owner.name === fileName) return tableName;
    taken.push(tableName);
  }

  return firstFreeTableName(base, taken);
}

async function recordTableOwnership(
  ctx: ApiContext,
  fileId: string,
  tableId: string
): Promise<void> {
  const { error } = await ctx.supabase
    .from("workspace_files")
    .update({ catalog_table_id: tableId })
    .eq("id", fileId);
  if (error && !isMissingOwnershipColumn(error)) {
    console.warn(`[file-ingest] posse de tabela não pôde ser gravada: ${error.message}`);
  }
}

export interface IngestPlan {
  dataSourceId: string;
  tableId: string;
  physicalName: string;
  /** Linhas únicas, NA ORDEM em que entram na tabela. */
  rows: Record<string, unknown>[];
  dedupedCount: number;
}

/**
 * Prepara o destino: fonte, dataset, tabela do catálogo, tabela física e
 * colunas. Não insere linha nenhuma.
 *
 * A separação existe porque inserir 300 mil linhas não cabe num pedido só —
 * a função da Vercel tem 60 segundos e cada lote é uma ida ao banco. Quem
 * chama insere o quanto der no tempo que tem e volta depois para continuar,
 * com esta preparação já feita.
 *
 * ATENÇÃO: esta função DERRUBA e recria a tabela física. Chamá-la de novo no
 * meio de uma ingestão apagaria o que já entrou — a continuação usa
 * insertRowsFrom direto.
 */
export async function prepareIngest(
  ctx: ApiContext,
  admin: SupabaseClient,
  fileName: string,
  parsed: ParsedFile,
  fileId?: string
): Promise<IngestPlan> {
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

  // 3. Catalog table. O nome sai do arquivo, mas o destino é conferido contra
  // quem já é dono de quê: reenviar o MESMO nome substitui (é atualização),
  // enquanto OUTRO arquivo que caia no mesmo nome normalizado ganha um nome
  // próprio em vez de derrubar a tabela alheia. Ver migração 0021.
  const logicalName = await resolveTableName(ctx, dataset.id, fileName);
  const { data: tableRow, error: tError } = await ctx.supabase
    .from("catalog_tables")
    .upsert(
      // row_count 0 até a ingestão terminar. Gravar o total aqui fazia uma
      // importação abandonada no meio ficar visível em /modelos anunciando
      // "306.431 linhas" com 190 mil dentro — e todo painel montado em cima
      // somava errado sem um único aviso.
      { workspace_id: ctx.workspaceId, dataset_id: dataset.id, name: logicalName, row_count: 0 },
      { onConflict: "dataset_id,name" }
    )
    .select("id")
    .single();
  if (tError || !tableRow) throw new Error(tError?.message ?? "Failed to register table");

  const physicalName = fileTableName(tableRow.id);

  if (fileId) await recordTableOwnership(ctx, fileId, tableRow.id);

  const uniqueRows = dedupeRows(parsed.rows);
  const dedupedCount = parsed.rows.length - uniqueRows.length;
  if (dedupedCount > 0) parsed = { ...parsed, rows: uniqueRows };

  if (parsed.rows.length > MAX_FILE_ROWS) throw new Error(tooManyRowsMessage(parsed.rows.length));

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

  return { dataSourceId, tableId: tableRow.id, physicalName, rows: parsed.rows, dedupedCount };
}

/** Nome de tabela física aceitável — o mesmo formato exigido pelas RPCs. */
const PHYSICAL_NAME = /^[a-z][a-z0-9_]{0,62}$/;

/**
 * Insere as linhas a partir de `offset` até acabar OU até o prazo estourar.
 *
 * Devolve o próximo offset. Igual a rows.length significa terminado; menor
 * significa "continue de onde parei" — é assim que um arquivo de 300 mil
 * linhas atravessa vários pedidos de 60 segundos sem que nenhum deles morra
 * no meio.
 *
 * Sempre insere ao menos um lote, mesmo com o prazo já vencido: devolver zero
 * progresso faria o navegador repetir o mesmo pedido para sempre.
 */
export async function insertRowsFrom(
  admin: SupabaseClient,
  physicalName: string,
  rows: Record<string, unknown>[],
  offset: number,
  deadlineAt: number
): Promise<number> {
  if (!PHYSICAL_NAME.test(physicalName)) throw new Error("invalid table name");

  let i = Math.max(0, offset);
  while (i < rows.length) {
    const batch = rows.slice(i, i + INSERT_BATCH);
    const { error } = await admin.rpc("insert_file_rows", {
      p_table_name: physicalName,
      p_rows: batch,
    });
    if (error) throw new Error(`Failed to insert rows: ${error.message}`);
    i += batch.length;
    if (Date.now() >= deadlineAt) break;
  }
  return i;
}

/**
 * Quantas linhas já estão na tabela física.
 *
 * A continuação NÃO confia no offset que o navegador manda: ele é palpite de
 * quem pode ter recarregado a página no meio. Contar no banco é a única fonte
 * que não mente — e como cada lote é uma instrução só, ou entrou inteiro ou
 * não entrou, então a contagem bate exatamente com o ponto de parada.
 */
export async function countIngestedRows(
  admin: SupabaseClient,
  physicalName: string
): Promise<number> {
  if (!PHYSICAL_NAME.test(physicalName)) throw new Error("invalid table name");
  const { data, error } = await admin.rpc("run_file_query", {
    p_query: `select count(*)::bigint as n from ${physicalName}`,
    p_max_rows: 1,
  });
  if (error) throw new Error(`Failed to count rows: ${error.message}`);
  const rows = (data ?? []) as Array<{ n?: number | string }>;
  return Number(rows[0]?.n ?? 0);
}

/**
 * Ingestão completa num pedido só. Serve para arquivo pequeno e para o caso
 * em que a leitura NÃO é reproduzível (layout remontado pela IA), onde
 * continuar depois exigiria repetir a chamada de IA.
 */
export async function ingestParsedFile(
  ctx: ApiContext,
  admin: SupabaseClient,
  fileName: string,
  parsed: ParsedFile
): Promise<{ dataSourceId: string; tableId: string; physicalName: string; rowCount: number; dedupedCount: number }> {
  const plan = await prepareIngest(ctx, admin, fileName, parsed);
  await insertRowsFrom(admin, plan.physicalName, plan.rows, 0, Number.POSITIVE_INFINITY);
  return {
    dataSourceId: plan.dataSourceId,
    tableId: plan.tableId,
    physicalName: plan.physicalName,
    rowCount: plan.rows.length,
    dedupedCount: plan.dedupedCount,
  };
}
