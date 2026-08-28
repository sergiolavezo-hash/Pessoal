import "server-only";

/**
 * Disjuntor por provedor.
 *
 * Camadas gratuitas são um recurso COMPARTILHADO por toda a plataforma: o
 * limite do Gemini é por dia e o do Groq é por minuto, contando todos os
 * clientes juntos. Quando um provedor devolve 429, insistir nele a cada
 * pedido desperdiça o tempo da função — e, com muitos clientes, todo mundo
 * fica esperando por um provedor que já se sabe esgotado.
 *
 * Guardamos o instante em que vale a pena tentar de novo e pulamos o
 * provedor até lá. O estado vive na memória da instância: cada máquina
 * aprende com o primeiro pedido que falhar, sem custo de banco. Não é
 * compartilhado entre instâncias — o preço disso é um pedido perdido por
 * instância, em troca de zero latência adicional em todos os outros.
 */

const cooldowns = new Map<string, number>();

/** Espera padrão quando o provedor não informa Retry-After. */
const DEFAULT_COOLDOWN_MS = 60_000;
/** Teto: um provedor nunca fica fora por mais que isto. */
const MAX_COOLDOWN_MS = 15 * 60_000;

/** Extrai a espera sugerida pelo provedor, quando existir. */
export function parseRetryAfterMs(message: string): number | null {
  // "Please try again in 7.2s" (Groq) ou "retryDelay": "50s" (Google)
  const seconds = message.match(/(?:try again in|retryDelay"?:)\s*"?(\d+(?:\.\d+)?)\s*s/i);
  if (seconds) return Math.ceil(Number(seconds[1]) * 1000);
  const minutes = message.match(/try again in\s+(\d+(?:\.\d+)?)\s*m(?!s)/i);
  if (minutes) return Math.ceil(Number(minutes[1]) * 60_000);
  return null;
}

/** Marca o provedor como indisponível por um tempo. */
export function tripBreaker(provider: string, message = ""): void {
  const suggested = parseRetryAfterMs(message) ?? DEFAULT_COOLDOWN_MS;
  const until = Date.now() + Math.min(suggested, MAX_COOLDOWN_MS);
  const current = cooldowns.get(provider) ?? 0;
  if (until > current) cooldowns.set(provider, until);
}

/** true quando o provedor está em descanso e deve ser pulado. */
export function isTripped(provider: string, now = Date.now()): boolean {
  const until = cooldowns.get(provider);
  if (until == null) return false;
  if (until <= now) {
    cooldowns.delete(provider);
    return false;
  }
  return true;
}

/** Quando o provedor volta a valer a pena; null se está disponível. */
export function trippedUntil(provider: string): number | null {
  const until = cooldowns.get(provider);
  return until != null && until > Date.now() ? until : null;
}

/** Libera o provedor (resposta bem-sucedida). */
export function resetBreaker(provider: string): void {
  cooldowns.delete(provider);
}

/** Erros que significam "sem capacidade agora", não "pedido inválido". */
export function isCapacityError(message: string): boolean {
  return /\b(429|quota|rate.?limit|too large|capacity|overloaded|insufficient|credit balance)\b/i.test(
    message
  );
}

/** Só para os testes: zera o estado entre casos. */
export function __resetAllBreakers(): void {
  cooldowns.clear();
}
