/**
 * Menor e maior de uma lista, sem espalhar em argumentos.
 *
 * `Math.max(...valores)` parece inofensivo e quebra justamente onde importa:
 * cada item vira um argumento, e acima de ~125 mil o V8 lança
 * "RangeError: Maximum call stack size exceeded". Essa é exatamente a faixa
 * de tamanho que este produto existe para analisar — um CSV de 306 mil linhas
 * derrubava a LEITURA do arquivo antes de qualquer outra coisa acontecer, com
 * uma mensagem que não diz nada a quem enviou a planilha.
 *
 * Um laço não tem esse teto. Devolve undefined para lista vazia, porque
 * -Infinity como "maior de nada" vira número em relatório.
 */
export function maxOf(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  let max = values[0];
  for (let i = 1; i < values.length; i++) if (values[i] > max) max = values[i];
  return max;
}

export function minOf(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  let min = values[0];
  for (let i = 1; i < values.length; i++) if (values[i] < min) min = values[i];
  return min;
}
