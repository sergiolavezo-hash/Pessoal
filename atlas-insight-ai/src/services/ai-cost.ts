import "server-only";

/**
 * Custo de IA: quanto cada execução custou de verdade no provedor e quanto a
 * Atlas cobra por ela. Manter isto isolado permite ajustar preço e margem sem
 * tocar no orquestrador.
 *
 * Os preços abaixo são CONFIGURAÇÃO, não verdade absoluta — cada provedor
 * publica a sua tabela e ela muda. Revise antes de abrir vendas e sempre que
 * trocar de modelo. Um modelo desconhecido cai no preço conservador (o mais
 * caro da lista), para nunca cobrar a menos do que custou.
 */

export interface ModelPrice {
  /** USD por 1 milhão de tokens de entrada. */
  inputPerMillionUsd: number;
  /** USD por 1 milhão de tokens de saída. */
  outputPerMillionUsd: number;
}

/** Preços por modelo (USD / 1M tokens). Conferido em 2026-08. */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  // Google Gemini — camada Flash
  "gemini-flash-latest": { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
  "gemini-3.7-flash": { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
  "gemini-3.6-flash": { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
  "gemini-3.5-flash": { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
  "gemini-2.5-flash": { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
  "gemini-flash-lite-latest": { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.4 },
  "gemini-3.1-flash-lite": { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.4 },
  "gemini-2.5-flash-lite": { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.4 },

  // OpenAI
  "gpt-4.1": { inputPerMillionUsd: 2.0, outputPerMillionUsd: 8.0 },
  "gpt-4.1-mini": { inputPerMillionUsd: 0.4, outputPerMillionUsd: 1.6 },
  "gpt-4.1-nano": { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.4 },
  "gpt-4o": { inputPerMillionUsd: 2.5, outputPerMillionUsd: 10.0 },
  "gpt-4o-mini": { inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.6 },

  // Modelos abertos servidos por camadas gratuitas (Groq, Cerebras,
  // OpenRouter). Não há custo de provedor; a Atlas cobra o mínimo de 1
  // centavo por execução, definido em priceRun.
  "openai/gpt-oss-120b": { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
  "openai/gpt-oss-20b": { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
  "gpt-oss-120b": { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
  "gpt-oss-20b": { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
  "qwen/qwen3.8-27b": { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
  "qwen/qwen3.6-27b": { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
  "gemma-4-31b": { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },

  // Anthropic
  "claude-opus-5": { inputPerMillionUsd: 5.0, outputPerMillionUsd: 25.0 },
  "claude-sonnet-5": { inputPerMillionUsd: 2.0, outputPerMillionUsd: 10.0 },
  "claude-haiku-4-5": { inputPerMillionUsd: 1.0, outputPerMillionUsd: 5.0 },
};

/** Usado quando o modelo não está na tabela: o mais caro que conhecemos. */
export const FALLBACK_PRICE: ModelPrice = { inputPerMillionUsd: 5.0, outputPerMillionUsd: 25.0 };

/**
 * O provedor devolve nomes com sufixo de versão (ex.: "gemini-flash-latest
 * -001", "gpt-4.1-2025-04-14"). Casamos pelo prefixo mais longo conhecido.
 */
export function priceFor(model: string): ModelPrice {
  const normalized = model.toLowerCase().trim();
  if (MODEL_PRICES[normalized]) return MODEL_PRICES[normalized];
  const match = Object.keys(MODEL_PRICES)
    .filter((known) => normalized.startsWith(known))
    .sort((a, b) => b.length - a.length)[0];
  return match ? MODEL_PRICES[match] : FALLBACK_PRICE;
}

/** Custo bruto pago ao provedor, em dólares. */
export function providerCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = priceFor(model);
  return (
    (Math.max(0, inputTokens) / 1_000_000) * price.inputPerMillionUsd +
    (Math.max(0, outputTokens) / 1_000_000) * price.outputPerMillionUsd
  );
}

/** Multiplicador de venda da Atlas sobre o custo do provedor. */
export const DEFAULT_MARGIN_MULTIPLIER = 3;
/** Câmbio usado para converter o custo em dólar para o preço em reais. */
export const DEFAULT_USD_TO_BRL = 5.6;

function positiveNumber(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function marginMultiplier(): number {
  return positiveNumber(process.env.AI_MARGIN_MULTIPLIER, DEFAULT_MARGIN_MULTIPLIER);
}

export function usdToBrl(): number {
  return positiveNumber(process.env.USD_TO_BRL, DEFAULT_USD_TO_BRL);
}

export interface RunCost {
  providerCostUsd: number;
  /** O que o cliente paga, em centavos de real (custo × margem × câmbio). */
  chargedCents: number;
}

/**
 * Preço final de uma execução. Arredonda para cima em centavos, com um
 * mínimo de 1 centavo sempre que houve consumo real de tokens.
 *
 * O mínimo vale inclusive para provedores gratuitos: a cota gratuita é um
 * recurso COMPARTILHADO entre todos os clientes, e sem medir, um usuário
 * pesado esgota a franquia de todos os outros. Cobrar o mínimo mede o uso
 * sem transformar o gratuito em caro.
 */
export function priceRun(model: string, inputTokens: number, outputTokens: number): RunCost {
  const costUsd = providerCostUsd(model, inputTokens, outputTokens);
  const consumed = Math.max(0, inputTokens) + Math.max(0, outputTokens) > 0;
  const chargedCents = Math.ceil(costUsd * marginMultiplier() * usdToBrl() * 100);
  return { providerCostUsd: costUsd, chargedCents: Math.max(consumed ? 1 : 0, chargedCents) };
}

/** Formata centavos como moeda brasileira para a interface. */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
