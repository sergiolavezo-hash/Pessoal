import type { ColumnClassification, ColumnProfile } from "@/types";

// Pure profiling logic — no I/O. The profiling service feeds sample rows in
// and persists the results.

export interface ColumnProfileResult {
  profile: ColumnProfile;
  classification: { classification: ColumnClassification; confidence: number };
}

const ID_NAME_RE = /(^|_)(id|key|code|uuid|guid)$/i;
const FK_NAME_RE = /(^|_)(\w+?)_(id|key|code)$/i;
/**
 * Nomes de chave em inglês E português. Sem o lado pt-BR, colunas como
 * `cod_marca` caem na regra de números e viram MEDIDA — e a IA passa a somar
 * códigos de marca, produzindo indicadores sem sentido.
 */
const KEY_NAME_RE =
  /(^|_)(id|key|code|uuid|guid|codigo|cod|chave)$|^(id|cod|codigo|chave|fk)_|_(codigo|chave)$/i;
const DATE_NAME_RE = /(^|_)(date|time|created|updated|at|dt)($|_)/i;
const MEASURE_NAME_RE =
  /(amount|value|price|cost|revenue|total|qty|quantity|profit|margin|salary|weight|balance|receita|faturamento|valor|custo|lucro|preco)/i;

const NUMERIC_TYPES = /int|numeric|decimal|float|double|real|money|number/i;
const DATE_TYPES = /date|time|timestamp/i;
const BOOL_TYPES = /bool|bit/i;

export function profileColumn(
  name: string,
  dataType: string,
  values: unknown[]
): ColumnProfileResult {
  const rowCount = values.length;
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  const nullCount = rowCount - nonNull.length;
  const uniqueValues = new Set(nonNull.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))));
  const uniqueCount = uniqueValues.size;
  const cardinality = nonNull.length > 0 ? uniqueCount / nonNull.length : 0;

  const numericValues = nonNull
    .map((v) => (typeof v === "number" ? v : Number(String(v).replace(",", "."))))
    .filter((n) => Number.isFinite(n));
  const isNumeric = NUMERIC_TYPES.test(dataType) || (numericValues.length > 0 && numericValues.length === nonNull.length);

  const profile: ColumnProfile = {
    row_count: rowCount,
    unique_count: uniqueCount,
    cardinality: round(cardinality),
    null_percentage: rowCount > 0 ? round(nullCount / rowCount) : 0,
    sample_values: [...uniqueValues].slice(0, 8),
  };

  if (isNumeric && numericValues.length > 0) {
    profile.min = Math.min(...numericValues);
    profile.max = Math.max(...numericValues);
    profile.average = round(numericValues.reduce((a, b) => a + b, 0) / numericValues.length);
  } else if (nonNull.length > 0) {
    const sorted = nonNull.map(String).sort();
    profile.min = sorted[0]?.slice(0, 64);
    profile.max = sorted[sorted.length - 1]?.slice(0, 64);
  }

  return { profile, classification: classifyColumn(name, dataType, profile, isNumeric) };
}

export function classifyColumn(
  name: string,
  dataType: string,
  profile: ColumnProfile,
  isNumeric: boolean
): { classification: ColumnClassification; confidence: number } {
  const cardinality = profile.cardinality ?? 0;
  const uniqueCount = profile.unique_count ?? 0;

  if (BOOL_TYPES.test(dataType) || (uniqueCount <= 2 && isBooleanLike(profile.sample_values ?? []))) {
    return { classification: "BOOLEAN", confidence: 0.95 };
  }

  if (DATE_TYPES.test(dataType)) return { classification: "DATE", confidence: 0.98 };
  if (DATE_NAME_RE.test(name) && looksLikeDates(profile.sample_values ?? [])) {
    return { classification: "DATE", confidence: 0.85 };
  }

  // Chaves antes de qualquer outra regra: um identificador nunca é medida,
  // mesmo sendo numérico. Único por linha => ID; repetido => chave estrangeira.
  if (KEY_NAME_RE.test(name) || FK_NAME_RE.test(name)) {
    return cardinality > 0.95
      ? { classification: "ID", confidence: 0.95 }
      : { classification: "FOREIGN_KEY", confidence: 0.9 };
  }

  if (ID_NAME_RE.test(name) && cardinality > 0.95) {
    return { classification: "ID", confidence: 0.95 };
  }
  // Só chamamos de identificador uma coluna única em tabela grande: numa
  // tabela-dimensão pequena (56 marcas, uma por linha) o nome legível é a
  // dimensão natural do painel, não uma chave opaca.
  if (cardinality >= 0.999 && !isNumericMeasureName(name) && (profile.row_count ?? 0) >= 200) {
    return { classification: "ID", confidence: 0.6 };
  }

  if (isNumeric) {
    if (isNumericMeasureName(name)) return { classification: "MEASURE", confidence: 0.95 };
    // High-cardinality continuous numbers are measures; low-cardinality
    // integers are more likely categorical dimensions.
    if (cardinality > 0.5) return { classification: "MEASURE", confidence: 0.75 };
    if (uniqueCount <= 25) return { classification: "CATEGORY", confidence: 0.6 };
    return { classification: "MEASURE", confidence: 0.55 };
  }

  if (uniqueCount > 0 && uniqueCount <= 50) {
    return { classification: "CATEGORY", confidence: 0.85 };
  }
  if (cardinality < 0.5) {
    return { classification: "DIMENSION", confidence: 0.7 };
  }
  return { classification: "TEXT", confidence: 0.6 };
}

function isNumericMeasureName(name: string): boolean {
  return MEASURE_NAME_RE.test(name);
}

function isBooleanLike(samples: unknown[]): boolean {
  const set = new Set(samples.map((s) => String(s).toLowerCase()));
  const boolTokens = new Set(["true", "false", "0", "1", "yes", "no", "sim", "nao", "não", "t", "f"]);
  return samples.length > 0 && [...set].every((s) => boolTokens.has(s));
}

function looksLikeDates(samples: unknown[]): boolean {
  const strings = samples.map(String).filter((s) => s.length >= 6);
  if (strings.length === 0) return false;
  return strings.every((s) => !Number.isNaN(Date.parse(s)));
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
