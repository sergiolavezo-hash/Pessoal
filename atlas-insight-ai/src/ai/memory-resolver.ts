/**
 * Responder pela memória, antes de chamar a IA.
 *
 * Quando um painel é gerado, cada widget já carrega o que ele calcula: o
 * título, a explicação e o SQL validado. Isso é memória — foi entendido uma
 * vez, com token gasto uma vez. Uma pergunta que corresponde a um widget que
 * já existe não precisa de IA nenhuma: basta executar aquele SQL, que é
 * exato e barato, ou reaproveitar o resultado já carregado na tela.
 *
 * O limite honesto: isto NÃO responde qualquer pergunta sem IA. Uma pergunta
 * genuinamente nova ("e se eu cruzar região com forma de pagamento?") precisa
 * de interpretação de linguagem, e nenhuma memória substitui isso. O que a
 * memória elimina é a repetição — que, num painel, é a maior parte.
 *
 * A regra que orienta os limiares: responder ERRADO é muito pior do que
 * gastar um token. Na dúvida, devolvemos null e a IA assume.
 */

export interface MemoryCandidate {
  id: string;
  title: string;
  explanation?: string;
  /** Slugs de indicadores em que o widget se baseia. */
  metrics?: string[];
}

export interface MemoryMatch {
  id: string;
  title: string;
  /** 0..1 — quanto da pergunta foi coberto pelo widget. */
  confidence: number;
}

/**
 * Palavras que aparecem em quase toda pergunta e não distinguem nada.
 * Mantê-las inflaria a semelhança entre perguntas que não têm relação.
 */
const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "do", "da", "dos", "das", "em", "no",
  "na", "nos", "nas", "por", "para", "com", "sem", "e", "ou", "que", "qual",
  "quais", "quanto", "quantos", "quanta", "quantas", "me", "meu", "minha",
  "mostre", "mostrar", "ver", "veja", "quero", "gostaria", "seria", "foi",
  "eh", "e", "esta", "este", "isso", "the", "of", "in", "to", "show",
]);

function terms(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");

  return new Set(
    normalized
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word))
  );
}

/**
 * Quanto da PERGUNTA o widget cobre.
 *
 * Deliberadamente assimétrico: divide pelos termos da pergunta, não pela
 * união. Um widget com título longo não deve ser penalizado por responder
 * uma pergunta curta — mas uma pergunta que traz um assunto ausente do
 * widget cai de nota, que é exatamente o caso em que a IA precisa entrar.
 */
function coverage(question: Set<string>, candidate: Set<string>): number {
  if (question.size === 0) return 0;
  let shared = 0;
  for (const word of question) if (candidate.has(word)) shared += 1;
  return shared / question.size;
}

/** Cobertura mínima para considerar que o widget responde a pergunta. */
const MIN_CONFIDENCE = 0.6;

/**
 * Vantagem mínima sobre o segundo colocado.
 *
 * Dois widgets empatados significam pergunta ambígua — "faturamento por
 * região" pode ser o gráfico de barras ou a tabela. Escolher um no par ou
 * ímpar entrega a resposta errada metade das vezes; a IA desempata.
 */
const MIN_MARGIN = 0.15;

/** Termos concretos mínimos: "qual o total?" não identifica widget nenhum. */
const MIN_QUESTION_TERMS = 2;

export function resolveFromMemory(
  question: string,
  candidates: MemoryCandidate[]
): MemoryMatch | null {
  const asked = terms(question);
  if (asked.size < MIN_QUESTION_TERMS || candidates.length === 0) return null;

  const scored = candidates
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      confidence: coverage(
        asked,
        terms(
          [candidate.title, candidate.explanation ?? "", ...(candidate.metrics ?? [])].join(" ")
        )
      ),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  if (best.confidence < MIN_CONFIDENCE) return null;

  const runnerUp = scored[1];
  if (runnerUp && best.confidence - runnerUp.confidence < MIN_MARGIN) return null;

  return best;
}
