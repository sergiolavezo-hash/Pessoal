/**
 * Quando a capacidade acaba, o usuário precisa saber QUANDO volta — não só
 * que acabou. Uma espera com prazo é aceitável; sem prazo, parece quebrado.
 */

/** "em 40 segundos", "em 12 minutos", "em cerca de 3 horas". */
export function formatWait(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds <= 90) return `em ${seconds} segundo${seconds === 1 ? "" : "s"}`;

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `em ${minutes} minuto${minutes === 1 ? "" : "s"}`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `em cerca de ${hours} hora${hours === 1 ? "" : "s"}`;

  const days = Math.round(hours / 24);
  return `em cerca de ${days} dia${days === 1 ? "" : "s"}`;
}

/**
 * A franquia diária vira quando o dia muda no banco, que trabalha em UTC.
 * Devolve quantos milissegundos faltam para essa virada.
 */
export function msUntilDailyReset(now: Date = new Date()): number {
  const nextReset = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return nextReset - now.getTime();
}

/** Hora local da virada, para o usuário conferir no relógio dele. */
export function dailyResetClock(now: Date = new Date(), locale = "pt-BR"): string {
  const reset = new Date(now.getTime() + msUntilDailyReset(now));
  return reset.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
