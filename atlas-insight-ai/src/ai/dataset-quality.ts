import type { WorkspaceAiContext } from "@/ai/context";

/**
 * Nota de qualidade da base, calculada sem IA.
 *
 * Mandar uma base ruim para o modelo e esperar que ele "descubra" que ela é
 * ruim custa tokens e devolve um painel de gráficos vazios. Tudo o que
 * decide se vale a pena gerar — existe medida? existe quebra? as colunas têm
 * dado? — está no perfil que já calculamos no upload. É aritmética, não
 * inteligência: dá para responder antes de gastar qualquer token.
 */

/**
 * Nota de uma base que só falta o Atlas terminar de ler.
 *
 * Fica ABAIXO do corte de propósito — gerar painel sem papel de coluna faz a
 * IA adivinhar e errar. Mas é uma nota separada das notas de dado ruim,
 * porque a saída é outra: aqui basta perfilar, não mexer na base.
 */
export const PENDING_PROFILE_SCORE = 35;

export interface DatasetQuality {
  score: number;
  /** A base só espera o perfilamento; não há nada errado com os dados. */
  pendingProfile?: boolean;
  /** Motivos legíveis do desconto, para explicar ao usuário o que corrigir. */
  problems: string[];
}

const EMPTY_COLUMN_THRESHOLD = 0.9;

export function scoreDataset(context: WorkspaceAiContext): DatasetQuality {
  const problems: string[] = [];

  const tables = context.rawSchema;
  if (tables.length === 0) {
    return {
      score: 0,
      problems: ["Nenhuma tabela sincronizada nesta fonte de dados."],
    };
  }

  const columns = tables.flatMap((t) => t.columns);
  if (columns.length === 0) {
    return { score: 0, problems: ["As tabelas desta fonte não têm colunas legíveis."] };
  }

  let score = 100;

  // Uma tabela sem nenhuma linha não gera painel nenhum: é a falha mais dura
  // e a mais barata de detectar.
  const withRowCount = tables.filter((t) => t.rowCount != null);
  const totalRows = withRowCount.reduce((sum, t) => sum + (t.rowCount ?? 0), 0);
  if (withRowCount.length > 0 && totalRows === 0) {
    return { score: 0, problems: ["A base está vazia: nenhuma linha de dados."] };
  }
  if (withRowCount.length > 0 && totalRows < 10) {
    score -= 40;
    problems.push(`A base tem apenas ${totalRows} linha(s) — pouco para uma análise.`);
  }

  // Perfil ausente cala TODO o resto do diagnóstico.
  //
  // Papel de coluna vem do perfilamento. Sem ele, "não há coluna numérica",
  // "não há categoria" e "não há data" não são fatos sobre a base — são
  // consequências de o Atlas ainda não ter olhado para ela. Reportar as
  // quatro coisas juntas somava −70 e devolvia nota 30 numa base perfeita,
  // acusando o dado do cliente por uma falha nossa e mandando ele "ajustar a
  // base", conselho que não tinha como funcionar. Uma causa, um problema.
  const profiled = columns.filter((c) => c.role != null);
  if (columns.length > 0 && profiled.length / columns.length < 0.5) {
    return {
      score: PENDING_PROFILE_SCORE,
      problems: [
        "O Atlas ainda não terminou de entender esta base (as colunas não foram perfiladas). Isso é uma etapa nossa, não um problema dos seus dados.",
      ],
      pendingProfile: true,
    };
  }

  // Sem medida numérica e sem data, o painel vira uma lista — a IA não tem o
  // que agregar nem por onde evoluir no tempo.
  const measures = columns.filter((c) => c.role === "MEASURE");
  const dates = columns.filter((c) => c.role === "DATE");
  const groupable = columns.filter(
    (c) => c.role === "CATEGORY" || c.role === "DIMENSION" || c.role === "BOOLEAN"
  );

  if (measures.length === 0) {
    score -= 25;
    problems.push("Nenhuma coluna numérica de valor foi identificada (só dá para contar registros).");
  }
  if (groupable.length === 0) {
    score -= 20;
    problems.push("Nenhuma coluna de categoria para quebrar a análise.");
  }
  if (dates.length === 0) {
    score -= 10;
    problems.push("Nenhuma coluna de data: não há evolução no tempo.");
  }

  // Colunas quase todas vazias enganam o modelo: ele monta o gráfico e o
  // resultado vem em branco.
  const mostlyEmpty = columns.filter(
    (c) => c.nullPercentage != null && c.nullPercentage >= EMPTY_COLUMN_THRESHOLD
  );
  if (mostlyEmpty.length > 0) {
    const share = mostlyEmpty.length / columns.length;
    score -= Math.min(25, Math.round(share * 50));
    problems.push(
      `${mostlyEmpty.length} de ${columns.length} colunas estão quase totalmente vazias.`
    );
  }

  return { score: Math.max(0, Math.min(100, score)), problems };
}
