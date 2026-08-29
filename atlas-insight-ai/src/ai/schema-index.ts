import type { RawSchemaTable, WorkspaceAiContext } from "@/ai/context";

/**
 * Índice do esquema — a ideia do PageIndex aplicada a dados, não a documentos.
 *
 * O problema é o mesmo que o RAG por chunking tenta resolver: o "documento"
 * não cabe no prompt. Aqui o documento é o esquema, e ele é enviado a CADA
 * chamada de IA. Medido neste código:
 *
 *     3 tabelas x  12 colunas ->   2.027 tokens
 *     8 tabelas x  30 colunas ->  12.446 tokens
 *    12 tabelas x  60 colunas ->  36.780 tokens
 *    12 tabelas x 150 colunas ->  91.620 tokens
 *
 * A camada gratuita da Groq recusa o pedido inteiro acima de 8.000 tokens por
 * minuto. Ou seja: a partir de umas 8 tabelas médias, a chamada não é lenta —
 * ela é impossível.
 *
 * A diferença em relação ao PageIndex de documentos: lá é preciso um modelo
 * para CONSTRUIR o sumário. Aqui a árvore já existe — tabela contém coluna, e
 * o perfilador já classificou cada coluna como valor, data ou categoria. O
 * sumário sai de graça, sem token nenhum.
 *
 * E a navegação também não precisa de IA na maior parte dos casos: a pergunta
 * costuma nomear a tabela ("faturamento por região" → tabela de vendas). Só
 * quando a correspondência é fraca é que vale gastar uma chamada para o
 * modelo escolher.
 */

const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "do", "da", "dos", "das", "em",
  "no", "na", "nos", "nas", "por", "para", "com", "sem", "e", "ou", "que",
  "qual", "quais", "quanto", "quantos", "me", "meu", "minha", "mostre",
  "mostrar", "quero", "total", "todos", "todas", "grafico", "painel",
  "dashboard", "the", "of", "in", "to", "show", "by",
]);

function terms(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/**
 * Sumário: uma linha por tabela, com o que ela mede e por onde se quebra.
 *
 * Vai SEMPRE junto, mesmo quando o detalhe é reduzido. Sem ele o modelo não
 * sabe que as outras tabelas existem e inventa colunas; com ele, consegue
 * dizer "isso está em outra tabela" em vez de alucinar uma resposta.
 */
export function renderSchemaIndex(tables: RawSchemaTable[]): string {
  const lines = tables.map((t) => {
    const by = (...roles: string[]) =>
      t.columns.filter((c) => c.role != null && roles.includes(c.role)).map((c) => c.name);

    const measures = by("MEASURE");
    const dates = by("DATE");
    const categories = by("CATEGORY", "DIMENSION", "BOOLEAN");

    const parts = [
      `- ${t.table} ("${t.label}")`,
      t.rowCount != null ? `${t.rowCount} linhas` : null,
      `${t.columns.length} colunas`,
      measures.length ? `mede: ${measures.slice(0, 6).join(", ")}` : null,
      dates.length ? `datas: ${dates.slice(0, 3).join(", ")}` : null,
      categories.length ? `quebra por: ${categories.slice(0, 6).join(", ")}` : null,
    ].filter(Boolean);

    return parts.join(" · ");
  });

  return `## Índice das tabelas disponíveis\n${lines.join("\n")}`;
}

/** Quanto uma tabela tem a ver com a pergunta. */
function relevance(asked: Set<string>, table: RawSchemaTable): number {
  if (asked.size === 0) return 0;

  const haystack = terms(
    [table.table, table.label, table.context ?? "", ...table.columns.map((c) => c.name)].join(" ")
  );

  let hits = 0;
  for (const word of asked) if (haystack.has(word)) hits += 1;
  return hits / asked.size;
}

/**
 * Escolhe as tabelas que a pergunta realmente pede.
 *
 * Devolve null quando nenhuma se destaca — sinal de que a seleção
 * determinística não serve e o chamador deve manter o comportamento antigo
 * (as tabelas maiores) em vez de arriscar cortar justamente a certa.
 */
export function selectRelevantTables(
  question: string,
  tables: RawSchemaTable[],
  maxTables: number
): RawSchemaTable[] | null {
  const asked = terms(question);
  if (asked.size === 0 || tables.length === 0) return null;

  const scored = tables
    .map((table) => ({ table, score: relevance(asked, table) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  // Mantém as que chegam perto da melhor. Um corte fixo descartaria a
  // segunda tabela de um join legítimo (vendas + clientes).
  const best = scored[0].score;
  const kept = scored.filter((entry) => entry.score >= best * 0.5).slice(0, maxTables);

  return kept.map((entry) => entry.table);
}

/**
 * Reduz o contexto ao que cabe no orçamento, preservando o sumário.
 *
 * Enquanto o esquema inteiro couber, nada muda — navegar custaria uma volta a
 * mais para economizar tokens que já sobravam. Acima do teto, o detalhe é
 * limitado às tabelas relevantes e o índice completo continua no prompt.
 */
export function narrowSchemaToBudget(
  context: WorkspaceAiContext,
  question: string,
  renderedLength: number,
  maxChars: number
): { tables: RawSchemaTable[]; index: string | null; narrowed: boolean } {
  if (renderedLength <= maxChars || context.rawSchema.length <= 1) {
    return { tables: context.rawSchema, index: null, narrowed: false };
  }

  // Proporcional ao estouro: um esquema pouco acima do teto perde pouco.
  const ratio = maxChars / renderedLength;
  const budgetTables = Math.max(1, Math.floor(context.rawSchema.length * ratio));

  const selected = selectRelevantTables(question, context.rawSchema, budgetTables);
  const tables = selected ?? context.rawSchema.slice(0, budgetTables);

  return { tables, index: renderSchemaIndex(context.rawSchema), narrowed: true };
}
