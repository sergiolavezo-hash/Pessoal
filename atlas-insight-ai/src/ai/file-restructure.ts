import "server-only";
import { z } from "zod";
import { getLLMProvider } from "@/ai/llm";
import { extractJson } from "@/ai/llm/types";
import { buildParsed, normalizeNumericString, type ParsedFile } from "@/services/file-ingest";

// Entendimento de dados desestruturados: planilhas "de gente" (modelos de
// orçamento, relatórios exportados, seções empilhadas, células mescladas,
// meses em colunas) não são tabelas. A IA analisa a grade bruta como um TODO
// e devolve um plano de reestruturação que aplicamos deterministicamente —
// o LLM nunca toca nos valores, só descreve a transformação.

const restructurePlanSchema = z.object({
  /** false = o arquivo já é uma tabela limpa; usar o parser padrão. */
  needsRestructure: z.boolean(),
  /** Primeira linha de DADOS (0-based) — tudo acima é descartado. */
  dataStartRow: z.number().int().min(0).default(0),
  columns: z
    .array(
      z.object({
        /** Índice da coluna na grade original (0-based). */
        index: z.number().int().min(0).max(200),
        /** Nome semântico em snake_case pt-BR (ex.: "categoria", "valor"). */
        name: z.string().min(1).max(60),
        role: z.enum(["dimension", "value", "ignore"]),
        /** Células mescladas: repete o último valor não vazio para baixo. */
        fillDown: z.boolean().optional().default(false),
      })
    )
    .min(1)
    .max(60),
  /** Linhas exatas a descartar (títulos, instruções, blocos-resumo). */
  skipRows: z.array(z.number().int().min(0)).max(500).default([]),
  /**
   * Descarta qualquer linha cujo texto em alguma coluna mantida contenha um
   * destes trechos (case-insensitive) — para subtotais e cabeçalhos repetidos
   * que se repetem além da amostra analisada.
   */
  skipRowContains: z.array(z.string().min(1).max(80)).max(40).default([]),
  /**
   * Despivotar colunas largas (ex.: meses) para formato longo. Os índices
   * devem apontar para colunas declaradas com role "value"; o nome de cada
   * coluna vira o valor da variável (ex.: "janeiro").
   */
  unpivot: z
    .object({
      columnIndexes: z.array(z.number().int().min(0)).min(2).max(60),
      variableName: z.string().min(1).max(40),
      valueName: z.string().min(1).max(40),
    })
    .nullable()
    .default(null),
  /** Resumo em pt-BR do que foi feito, mostrado ao usuário. */
  summary: z.string().max(400).default(""),
});

export type RestructurePlan = z.infer<typeof restructurePlanSchema>;

/** Gemini devolve null onde o Zod espera undefined. */
function stripNulls<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (_k, v) => (v === null ? undefined : v)) as T;
}

/**
 * Orçamento de tempo da leitura por IA. O upload roda numa função com tempo
 * limitado e a cadeia de fallback pode tentar vários modelos em sequência —
 * sem um teto, o pedido inteiro morre e o arquivo fica preso em "processando".
 * Estourado o prazo, seguimos com o leitor heurístico.
 */
export const LAYOUT_ANALYSIS_BUDGET_MS = 25_000;

const MAX_SAMPLE_ROWS = 120;
const MAX_SAMPLE_COLS = 26;
const MAX_CELL_CHARS = 28;

function renderMatrixSample(matrix: unknown[][]): string {
  const lines: string[] = [];
  const rows = Math.min(matrix.length, MAX_SAMPLE_ROWS);
  for (let i = 0; i < rows; i++) {
    const cells = (matrix[i] ?? []).slice(0, MAX_SAMPLE_COLS).map((v) => {
      if (v == null) return null;
      const s = String(v);
      return s.length > MAX_CELL_CHARS ? `${s.slice(0, MAX_CELL_CHARS)}…` : s;
    });
    lines.push(`Row ${i}: ${JSON.stringify(cells)}`);
  }
  if (matrix.length > rows) lines.push(`... and ${matrix.length - rows} more rows (same structure).`);
  return lines.join("\n");
}

/** Sinais de que o parser heurístico não entendeu o layout. */
export function looksUnstructured(parsed: ParsedFile): boolean {
  return (
    parsed.columns.some((c) => /^col(una)?_\d+/.test(c.name)) ||
    parsed.warnings.some((w) => w.startsWith("Header detected") || w.includes("empty column"))
  );
}

const SYSTEM_PROMPT = `You are a senior data engineer who turns messy human spreadsheets into clean analytical tables.

You receive the RAW GRID of a spreadsheet (row by row, 0-based indices). Analyze the file AS A WHOLE — not column by column. These files often contain: decorative titles, instruction text, section labels wrapped across several rows, merged cells (value only on the first row of a group), repeated header rows, subtotal/percentage rows, summary blocks at the bottom, and wide layouts with one column per month/period.

Return ONLY a JSON object with this exact shape:
{
  "needsRestructure": boolean,        // false if the grid is already a clean single-header table
  "dataStartRow": number,             // first row (0-based) that contains actual DATA records
  "columns": [                        // every original column worth describing
    { "index": number, "name": "snake_case_pt_br", "role": "dimension"|"value"|"ignore", "fillDown": boolean }
  ],
  "skipRows": [number],               // exact rows to drop: titles, instructions, summary blocks, repeated headers
  "skipRowContains": ["texto"],       // drop any row whose kept-column text contains one of these (subtotals like "total", "% sobre receita")
  "unpivot": {                        // or null. Use when there is one column per month/period.
    "columnIndexes": [number],        // the wide value columns (must have role "value")
    "variableName": "mes",
    "valueName": "valor"
  },
  "summary": "1-2 frases em pt-BR explicando o que você fez"
}

Rules:
- Column names: short snake_case Portuguese, meaningful ("categoria", "item", "secao", "mes", "valor"). NEVER "coluna_5".
- Mark section/group label columns that only appear on the first row of each group with "fillDown": true.
- Text columns that only contain explanatory prose (wrapped instructions) get role "ignore".
- Subtotal/total/percentage rows and bottom summary blocks must be excluded (skipRows and/or skipRowContains) — analytical tables must contain only atomic records, or every SUM would double count.
- If several stacked sections share the same columns (e.g. Receitas / Despesas), keep them as rows and expose the section as a fillDown dimension column when the grid provides it.
- skipRowContains entries must be distinctive lowercase substrings ("total ", "% sobre") that will not match legitimate data rows.
- The transformation must be lossless for real data: when in doubt, keep the row.`;

/**
 * Pede à IA um plano de reestruturação para a grade bruta.
 * Retorna null quando a IA considera o arquivo já estruturado ou falha —
 * o chamador usa o parser heurístico nesses casos.
 */
export function buildLayoutPrompt(matrix: unknown[][], fileName: string): string {
  return `File name: ${fileName}\nGrid (${matrix.length} rows):\n\n${renderMatrixSample(matrix)}`;
}

export const LAYOUT_SYSTEM_PROMPT = SYSTEM_PROMPT;

/**
 * Interpreta a resposta do modelo. Fica separado da chamada para que o
 * orquestrador — que é quem tem crédito, cota e registro — faça a chamada.
 */
export function parseLayoutPlan(text: string): RestructurePlan | null {
  const plan = restructurePlanSchema.parse(stripNulls(extractJson(text)));
  if (!plan.needsRestructure) return null;
  if (plan.columns.every((c) => c.role === "ignore")) return null;
  return plan;
}

/**
 * Versão sem medição, mantida apenas para uso interno em testes.
 *
 * O caminho de produção passa por AIOrchestrator.analyzeFileLayout: esta
 * função chamava o provedor diretamente, sem checar crédito, sem cota e sem
 * gravar nada em ai_runs — qualquer upload de planilha bagunçada gerava uma
 * chamada de IA invisível no consumo.
 */
export async function analyzeFileLayout(
  matrix: unknown[][],
  fileName: string,
  budgetMs: number = LAYOUT_ANALYSIS_BUDGET_MS
): Promise<RestructurePlan | null> {
  const provider = getLLMProvider();
  const prompt = buildLayoutPrompt(matrix, fileName);

  const analysis = provider.complete({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    jsonMode: true,
    maxTokens: 4000,
  });

  // Corrida com o relógio: o upload não pode ficar refém da IA.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Layout analysis exceeded ${budgetMs}ms`)),
      budgetMs
    );
  });

  try {
    const response = await Promise.race([analysis, deadline]);
    const plan = restructurePlanSchema.parse(stripNulls(extractJson(response.text)));
    if (!plan.needsRestructure) return null;
    if (plan.columns.every((c) => c.role === "ignore")) return null;
    return plan;
  } finally {
    clearTimeout(timer);
    // Evita "unhandled rejection" quando o prazo vence antes da resposta.
    analysis.catch(() => {});
  }
}

/** Comparação tolerante a acentos/caixa, para casar rótulos com nomes. */
function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Aplica o plano da IA deterministicamente sobre a grade original.
 *
 * Além do plano, aplica duas defesas que NÃO dependem da IA acertar linha a
 * linha — ambas evitam a soma dupla que arruína qualquer indicador:
 * 1. um novo cabeçalho no meio da grade marca o início de outro bloco
 *    (tipicamente um resumo com totais); a extração para ali;
 * 2. valores de texto soltos numa coluna de medida majoritariamente numérica
 *    são descartados.
 *
 * Lança erro se o resultado ficar vazio (o chamador usa o fallback).
 */
export function applyRestructurePlan(
  matrix: unknown[][],
  plan: RestructurePlan,
  baseWarnings: string[]
): ParsedFile {
  const warnings = [...baseWarnings];
  const skip = new Set(plan.skipRows);
  const junkPatterns = plan.skipRowContains.map((s) => s.toLowerCase());
  const cols = plan.columns.filter((c) => c.role !== "ignore");
  if (cols.length === 0) throw new Error("Restructure plan kept no columns");

  // Uma linha cujas células repetem os nomes das colunas é um cabeçalho
  // novo: dali em diante começa outro bloco (resumo, totais, outra tabela).
  const nameByIndex = new Map(cols.map((c) => [c.index, normalizeLabel(c.name)]));
  const isRepeatedHeader = (r: unknown[]): boolean => {
    let matches = 0;
    for (const c of cols) {
      const cell = r[c.index];
      if (cell == null) continue;
      if (normalizeLabel(String(cell)) === nameByIndex.get(c.index)) matches++;
    }
    return matches >= 2;
  };

  const rows: unknown[][] = [];
  const lastFill: Record<number, unknown> = {};
  let truncatedAt: number | null = null;
  for (let i = plan.dataStartRow; i < matrix.length; i++) {
    if (skip.has(i)) continue;
    const r = [...(matrix[i] ?? [])];
    if (rows.length > 0 && isRepeatedHeader(r)) {
      truncatedAt = i;
      break;
    }
    const text = (j: number) => (r[j] == null ? "" : String(r[j]).trim());
    const isJunk =
      junkPatterns.length > 0 &&
      cols.some((c) => {
        const t = text(c.index).toLowerCase();
        return t !== "" && junkPatterns.some((p) => t.includes(p));
      });
    if (isJunk) continue;
    if (!cols.some((c) => text(c.index) !== "")) continue;
    for (const c of plan.columns) {
      if (!c.fillDown) continue;
      const v = r[c.index];
      if (v != null && String(v).trim() !== "") lastFill[c.index] = v;
      else r[c.index] = lastFill[c.index] ?? null;
    }
    rows.push(r);
  }
  if (rows.length === 0) throw new Error("Restructure plan produced no data rows");
  if (truncatedAt != null) {
    warnings.push(
      `Um novo cabeçalho foi encontrado na linha ${truncatedAt + 1}: o bloco seguinte (resumo/totais) foi ignorado para não somar os mesmos valores duas vezes.`
    );
  }

  // Colunas de medida majoritariamente numéricas não carregam texto solto.
  const valueIndexes = plan.unpivot
    ? plan.unpivot.columnIndexes
    : cols.filter((c) => c.role === "value").map((c) => c.index);
  let scrubbed = 0;
  for (const j of valueIndexes) {
    const present = rows
      .map((r) => (r[j] == null ? "" : String(r[j]).trim()))
      .filter((s) => s !== "");
    if (present.length === 0) continue;
    const numeric = present.filter((s) => normalizeNumericString(s) != null).length;
    if (numeric / present.length < 0.7) continue;
    for (const r of rows) {
      const s = r[j] == null ? "" : String(r[j]).trim();
      if (s !== "" && normalizeNumericString(s) == null) {
        r[j] = null;
        scrubbed++;
      }
    }
  }
  if (scrubbed > 0) {
    warnings.push(`${scrubbed} valor(es) de texto em colunas numéricas foram descartados.`);
  }

  if (plan.summary) warnings.push(`IA reestruturou o arquivo: ${plan.summary}`);

  if (plan.unpivot) {
    const wide = new Set(plan.unpivot.columnIndexes);
    const idCols = cols.filter((c) => !wide.has(c.index));
    const valueCols = cols.filter((c) => wide.has(c.index));
    if (valueCols.length < 2) throw new Error("Unpivot plan has fewer than 2 value columns");
    const objects: Record<string, unknown>[] = [];
    for (const r of rows) {
      for (const vc of valueCols) {
        const raw = r[vc.index];
        if (raw == null || String(raw).trim() === "") continue;
        const obj: Record<string, unknown> = {};
        for (const c of idCols) obj[`c${c.index}`] = r[c.index] ?? null;
        obj.__variable = vc.name;
        obj.__value = raw;
        objects.push(obj);
      }
    }
    if (objects.length === 0) throw new Error("Unpivot produced no data rows");
    warnings.push(
      `${valueCols.length} colunas de período viraram linhas (formato longo: ${plan.unpivot.variableName}/${plan.unpivot.valueName}).`
    );
    return buildParsed(
      [...idCols.map((c) => c.name), plan.unpivot.variableName, plan.unpivot.valueName],
      objects,
      warnings,
      [...idCols.map((c) => `c${c.index}`), "__variable", "__value"]
    );
  }

  const objects = rows.map((r) => {
    const obj: Record<string, unknown> = {};
    for (const c of cols) obj[`c${c.index}`] = r[c.index] ?? null;
    return obj;
  });
  return buildParsed(
    cols.map((c) => c.name),
    objects,
    warnings,
    cols.map((c) => `c${c.index}`)
  );
}
