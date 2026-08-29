/**
 * Filtros do painel.
 *
 * A consulta de cada widget já foi gerada, validada e testada contra a fonte.
 * Reescrevê-la para encaixar um WHERE exigiria interpretar SQL alheio — e
 * errar aí quebra o painel ou, pior, muda o número sem avisar. Em vez disso o
 * filtro envolve a consulta original:
 *
 *     select * from ( <consulta do widget> ) as atlas_q where ...
 *
 * A consulta interna não é tocada. Isso traz uma limitação que a interface
 * PRECISA respeitar: só dá para filtrar por coluna que aparece no RESULTADO
 * do widget. Oferecer um filtro que não muda nada é pior que não oferecer —
 * o usuário mexe, o número fica igual, e ele deixa de confiar na tela.
 *
 * Sobre segurança: nenhum texto do usuário entra cru. Nomes de coluna são
 * conferidos contra as colunas reais do resultado, e valores são aspados com
 * a duplicação de aspas simples, que é o escape do padrão SQL.
 */

export type FilterType = "date_range" | "select" | "multi_select";

export interface DashboardFilter {
  field: string;
  label: string;
  type: FilterType;
  options?: string[];
}

export interface FilterValue {
  field: string;
  type: FilterType;
  /** select/multi_select: valores escolhidos. */
  values?: string[];
  /** date_range: limites em ISO (YYYY-MM-DD). */
  from?: string;
  to?: string;
}

/** Identificador aceitável de coluna — sem espaço, aspas ou pontuação. */
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Aspas simples viram duas — o escape do padrão SQL.
 *
 * Vale para o conteúdo, não para o nome da coluna: identificador não é
 * escapado, é conferido contra a lista real de colunas. Um nome que não está
 * na lista simplesmente não vira filtro.
 */
export function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function quoteIdentifier(name: string): string {
  return `"${name}"`;
}

/**
 * O filtro pode ser aplicado a este widget?
 *
 * Precisa de uma coluna com nome utilizável E presente no resultado. As duas
 * condições evitam o pior caso: um filtro que aparece na tela, o usuário
 * confia, e ele não faz nada.
 */
export function canApply(filter: { field: string }, outputColumns: string[]): boolean {
  return SAFE_IDENTIFIER.test(filter.field) && outputColumns.includes(filter.field);
}

/** Uma condição SQL, ou null quando o valor escolhido não filtra nada. */
function condition(value: FilterValue): string | null {
  const column = quoteIdentifier(value.field);

  if (value.type === "date_range") {
    const parts: string[] = [];
    if (value.from && ISO_DATE.test(value.from)) {
      parts.push(`${column} >= ${quoteLiteral(value.from)}`);
    }
    if (value.to && ISO_DATE.test(value.to)) {
      parts.push(`${column} <= ${quoteLiteral(value.to)}`);
    }
    return parts.length > 0 ? parts.join(" and ") : null;
  }

  const chosen = (value.values ?? []).filter((v) => typeof v === "string" && v.length > 0);
  if (chosen.length === 0) return null;

  // IN cobre um e vários valores; escrever "=" para um só não muda nada
  // e duplicaria o caminho a manter.
  return `${column} in (${chosen.map(quoteLiteral).join(", ")})`;
}

export interface FilterApplication {
  sql: string;
  /** Campos que de fato entraram na consulta. */
  applied: string[];
  /** Escolhidos pelo usuário mas ignorados por não estarem no resultado. */
  ignored: string[];
}

/**
 * Envolve a consulta do widget com os filtros aplicáveis.
 *
 * Sem nenhum filtro aplicável a consulta volta intacta — envolver por
 * envolver só acrescentaria uma subconsulta para o banco planejar à toa.
 */
export function applyFilters(
  sql: string,
  values: FilterValue[],
  outputColumns: string[]
): FilterApplication {
  const applied: string[] = [];
  const ignored: string[] = [];
  const conditions: string[] = [];

  for (const value of values) {
    if (!canApply(value, outputColumns)) {
      ignored.push(value.field);
      continue;
    }
    const clause = condition(value);
    // Filtro sem valor escolhido não é "ignorado": o usuário simplesmente
    // não filtrou por ele, e avisar seria ruído.
    if (!clause) continue;
    conditions.push(clause);
    applied.push(value.field);
  }

  if (conditions.length === 0) return { sql, applied, ignored };

  // O ponto e vírgula final quebraria a subconsulta.
  const inner = sql.trim().replace(/;\s*$/, "");
  return {
    sql: `select * from (\n${inner}\n) as atlas_q where ${conditions.join(" and ")}`,
    applied,
    ignored,
  };
}

/**
 * Aplica os filtros nas linhas JÁ CARREGADAS, sem ir ao banco.
 *
 * Como só é permitido filtrar por coluna presente no RESULTADO, filtrar aqui
 * dá o mesmo que envolver a consulta num WHERE externo — a diferença é que
 * não custa consulta nenhuma. Trocar de filtro vira instantâneo em vez de
 * disparar uma rodada de SELECTs por widget a cada clique.
 *
 * A ressalva honesta: se o resultado veio truncado pelo teto de linhas, o
 * filtro age sobre o que foi trazido. Para widget agregado — que é a maioria
 * num painel — isso não acontece, porque o resultado já cabe inteiro.
 */
export function filterRows(
  rows: Array<Record<string, unknown>>,
  values: FilterValue[],
  outputColumns: string[]
): Array<Record<string, unknown>> {
  const usable = values.filter((v) => canApply(v, outputColumns));
  if (usable.length === 0) return rows;

  return rows.filter((row) =>
    usable.every((filter) => {
      const cell = row[filter.field];

      if (filter.type === "date_range") {
        if (cell == null) return false;
        // Comparação em texto ISO: "2026-03-04" > "2026-03-01" é verdade
        // lexicograficamente, e evita depender do fuso ao construir Date.
        const iso = String(cell).slice(0, 10);
        if (filter.from && ISO_DATE.test(filter.from) && iso < filter.from) return false;
        if (filter.to && ISO_DATE.test(filter.to) && iso > filter.to) return false;
        return true;
      }

      const chosen = (filter.values ?? []).filter((v) => v.length > 0);
      // Nada escolhido não filtra nada — o usuário só não usou este filtro.
      if (chosen.length === 0) return true;
      return chosen.includes(String(cell));
    })
  );
}

/** Valores distintos de uma coluna, para montar as opções do seletor. */
export function distinctValues(
  rows: Array<Record<string, unknown>>,
  field: string,
  limit = 100
): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = row[field];
    if (value == null) continue;
    seen.add(String(value));
    if (seen.size >= limit) break;
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
