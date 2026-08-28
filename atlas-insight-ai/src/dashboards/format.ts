/**
 * Formatação de valores nos painéis.
 *
 * Duas formas, com papéis diferentes: a COMPACTA vive nos eixos e nos rótulos
 * diretos, onde o espaço é escasso e a ordem de grandeza é o que importa; a
 * COMPLETA vive no tooltip, no KPI e na tabela, onde o leitor quer o número.
 * Misturar as duas é o que faz um eixo virar "1.234.567,89" e comer meia tela.
 *
 * O produto é brasileiro: moeda em real e separadores pt-BR. Formatar em
 * en-US/USD não é detalhe estético — mostra o valor errado ao usuário.
 */

export type ValueFormat = "number" | "currency" | "percent" | "decimal";

const LOCALE = "pt-BR";
const CURRENCY = "BRL";

function optionsFor(format: ValueFormat | undefined, compact: boolean): Intl.NumberFormatOptions {
  switch (format) {
    case "currency":
      return {
        style: "currency",
        currency: CURRENCY,
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : 2,
        minimumFractionDigits: compact ? 0 : 2,
      };
    case "percent":
      // Percentuais chegam do SQL já como fração (0,42) ou como pontos (42)?
      // O contrato é fração — é o que o Intl espera e o que o SQL de share
      // produz (valor/total).
      return { style: "percent", maximumFractionDigits: 1 };
    case "decimal":
      return {
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : 2,
        minimumFractionDigits: compact ? 0 : 2,
      };
    default:
      return {
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: 1,
      };
  }
}

/** Número por extenso: tooltip, KPI, célula de tabela. */
export function formatValue(value: number, format?: ValueFormat | string): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(LOCALE, optionsFor(format as ValueFormat, false)).format(value);
}

/** Número curto: marcas de eixo e rótulos sobre as marcas. */
export function formatCompact(value: number, format?: ValueFormat | string): string {
  if (!Number.isFinite(value)) return "—";
  // Abaixo de mil, "compacto" e "completo" são iguais — e o compacto perde
  // as casas decimais que importam em valores pequenos.
  const compact = Math.abs(value) >= 1000;
  return new Intl.NumberFormat(LOCALE, optionsFor(format as ValueFormat, compact)).format(value);
}

/** Variação assinada entre dois períodos, para a linha de delta do KPI. */
export function formatDelta(current: number, previous: number): { text: string; direction: 1 | 0 | -1 } | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const ratio = (current - previous) / Math.abs(previous);
  if (!Number.isFinite(ratio)) return null;
  const direction = ratio > 0.0001 ? 1 : ratio < -0.0001 ? -1 : 0;
  const text = new Intl.NumberFormat(LOCALE, {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(ratio);
  return { text, direction };
}

/**
 * Encurta um rótulo de categoria sem cortar no meio de uma palavra quando dá,
 * porque eixo com texto truncado no meio da sílaba fica ilegível.
 */
export function shortenLabel(label: string, max: number): string {
  if (label.length <= max) return label;
  const cut = label.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * Escala com marcas redondas.
 *
 * Deixar o Recharts dividir o máximo por quatro produz eixos como
 * "R$ 950,00 / R$ 1,9 mil / R$ 2,9 mil" — números que ninguém usa para
 * comparar de cabeça. O eixo existe para carregar os valores que não foram
 * rotulados direto na marca; se ele próprio for difícil de ler, não carrega
 * nada. Aqui o passo é sempre 1, 2, 2,5 ou 5 vezes uma potência de dez.
 */
export function niceScale(values: number[], count = 4): { domain: [number, number]; ticks: number[] } {
  const finite = values.filter((v) => Number.isFinite(v));
  const rawMax = finite.length > 0 ? Math.max(...finite) : 0;
  const rawMin = Math.min(0, ...finite);
  if (rawMax === 0 && rawMin === 0) return { domain: [0, 1], ticks: [0, 1] };

  const step = niceStep((rawMax - rawMin) / Math.max(count, 1));
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;

  const ticks: number[] = [];
  // Somar em ponto flutuante acumula erro (0,1+0,2…); multiplicar o índice
  // pelo passo mantém cada marca exata.
  const steps = Math.round((max - min) / step);
  for (let i = 0; i <= steps; i++) ticks.push(round(min + i * step));
  return { domain: [min, max], ticks };
}

function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

/** Corta o lixo de ponto flutuante sem mexer em valores legítimos. */
function round(v: number): number {
  return Math.abs(v) < 1e-9 ? 0 : Number(v.toPrecision(12));
}

/**
 * Nome de coluna legível. O alias vem do SQL que a IA escreveu
 * ("categoria_sales", "total_january") e aparece em cabeçalho, legenda e
 * tooltip — texto de máquina no lugar onde o usuário procura sentido.
 */
export function humanizeField(field: string): string {
  const spaced = field
    .replace(/[_-]+/g, " ")
    // camelCase → duas palavras, sem quebrar siglas ("CNPJ" continua inteiro).
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .trim();
  if (spaced === "") return field;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
