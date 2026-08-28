/**
 * Vocabulário visual dos gráficos.
 *
 * A cor aqui não é decoração: cada trabalho tem uma regra. Identidade →
 * categórica (ordem fixa, nunca reciclada). Magnitude → sequencial (uma
 * matiz, claro→escuro). Estado → status (reservado, sempre com ícone e
 * rótulo). Manter isso num só lugar impede que um gráfico invente a própria
 * paleta e quebre a leitura do painel inteiro.
 */

/**
 * Ordem categórica validada. A ORDEM é o mecanismo de segurança para
 * daltonismo — foi ela que passou nos testes de separação, não as cores
 * soltas. Atribuir sempre na sequência; a partir do 9º item a resposta é
 * agrupar em "Outros", nunca gerar uma nona matiz.
 */
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

export const MAX_SERIES = SERIES_COLORS.length;

/** Cinza de contexto: "Outros" e as séries que não são o assunto. */
export const OTHER_COLOR = "var(--chart-other)";

export function seriesColor(index: number): string {
  return SERIES_COLORS[index] ?? OTHER_COLOR;
}

/** Rampa sequencial de uma matiz, para magnitude contínua (heatmap). */
export const SEQUENTIAL_RAMP = [
  "var(--chart-seq-100)",
  "var(--chart-seq-250)",
  "var(--chart-seq-400)",
  "var(--chart-seq-550)",
  "var(--chart-seq-700)",
] as const;

/**
 * Degrau da rampa para uma fração 0..1. Discretizar em cinco passos é
 * deliberado: mais classes do que o olho separa viram ruído, e o leitor
 * consegue casar a célula com a legenda de escala.
 */
export function sequentialStep(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  const index = Math.min(SEQUENTIAL_RAMP.length - 1, Math.floor(clamped * SEQUENTIAL_RAMP.length));
  return SEQUENTIAL_RAMP[index];
}

/** Tinta do cromo — recessiva por definição: o dado é a única coisa forte. */
export const CHART_INK = {
  surface: "var(--chart-surface)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  label: "var(--chart-label)",
  foreground: "var(--foreground)",
} as const;

/** Marcas de eixo: hairline sólida, texto discreto, nunca tracejada. */
export const AXIS_TICK = { fontSize: 11, fill: CHART_INK.label } as const;

/**
 * Espessuras fixas. Marca fina, grade capilar, respiro generoso — é o que
 * separa um painel sóbrio de um gráfico de planilha.
 */
export const MARK = {
  /** Barra nunca preenche a faixa: a sobra é ar. */
  maxBarSize: 24,
  /** Ponta arredondada 4px; a base fica reta, ancorada na linha zero. */
  barRadius: 4,
  lineWidth: 2,
  dotRadius: 4,
  /** Área é lavagem, não bloco saturado. */
  areaOpacity: 0.1,
  /** Vão em cor de superfície entre marcas encostadas. */
  gap: 2,
} as const;
