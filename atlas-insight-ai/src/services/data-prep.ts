import "server-only";

/**
 * Preparação de dados (estilo Power Query) sobre tabelas de arquivo.
 * A expressão de coluna calculada é validada token a token: apenas colunas
 * reais da tabela, literais e uma allowlist de funções/palavras-chave SQL.
 */

const ALLOWED_WORDS = new Set([
  // controle
  "case", "when", "then", "else", "end", "and", "or", "not", "is", "null",
  "like", "ilike", "in", "between", "true", "false", "as", "cast", "interval",
  "distinct", "similar", "to", "escape",
  // tipos (para cast)
  "text", "numeric", "bigint", "int", "integer", "boolean", "date",
  "timestamptz", "timestamp", "double", "precision", "real",
  // funções de texto
  "upper", "lower", "trim", "btrim", "ltrim", "rtrim", "concat", "coalesce",
  "nullif", "substring", "replace", "split_part", "left", "right", "length",
  "initcap", "position", "lpad", "rpad", "reverse", "translate", "regexp_replace",
  // números
  "round", "abs", "ceil", "ceiling", "floor", "power", "sqrt", "mod",
  "greatest", "least", "sign", "trunc", "div", "exp", "ln", "log",
  // datas
  "extract", "date_trunc", "date_part", "to_char", "to_date", "to_timestamp",
  "to_number", "age", "now", "current_date", "current_timestamp",
  "year", "month", "day", "hour", "minute", "second", "week", "quarter", "dow", "doy", "epoch",
]);

export interface ExpressionCheck {
  ok: boolean;
  reason?: string;
}

export function validateComputedExpression(
  expression: string,
  allowedColumns: string[]
): ExpressionCheck {
  if (!expression.trim()) return { ok: false, reason: "Expressão vazia." };
  if (expression.length > 2000) return { ok: false, reason: "Expressão longa demais." };
  if (/;|--|\/\*/.test(expression)) {
    return { ok: false, reason: "Expressão não pode conter ';' nem comentários." };
  }
  // Proibições estruturais: subconsultas e referências a outras tabelas/schemas.
  if (/\bselect\b|\bfrom\b|\bjoin\b|\bunion\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b|\bgrant\b|\bpg_\w+/i.test(expression)) {
    return { ok: false, reason: "A expressão só pode usar colunas desta tabela e funções simples." };
  }
  if (expression.includes(".")) {
    // impede schema.tabela.coluna; casts usam :: e números decimais são tratados abaixo
    if (/[a-zA-Z_"][a-zA-Z0-9_"]*\s*\.\s*[a-zA-Z_"]/.test(expression)) {
      return { ok: false, reason: "Referências qualificadas (tabela.coluna) não são permitidas." };
    }
  }

  const columns = new Set(allowedColumns.map((c) => c.toLowerCase()));
  // Remove literais de string antes de checar identificadores.
  const stripped = expression.replace(/'(?:[^']|'')*'/g, "''");
  const identifiers = stripped.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
  for (const raw of identifiers) {
    const word = raw.toLowerCase();
    if (columns.has(word)) continue;
    if (ALLOWED_WORDS.has(word)) continue;
    return {
      ok: false,
      reason: `"${raw}" não é uma coluna desta tabela nem uma função permitida.`,
    };
  }
  return { ok: true };
}

const NAME_RE = /^[a-z_][a-z0-9_]{0,58}$/;

export function validateColumnName(name: string): ExpressionCheck {
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      reason: "Nome inválido: use minúsculas, números e _ (começando por letra).",
    };
  }
  return { ok: true };
}

export const PREP_COLUMN_TYPES = [
  "text",
  "numeric",
  "bigint",
  "numeric",
  "double precision", // aceito em bases legadas; novas usam numeric
  "date",
  "timestamptz",
  "boolean",
] as const;
