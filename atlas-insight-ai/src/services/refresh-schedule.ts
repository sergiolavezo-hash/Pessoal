/**
 * Agendamento de atualização, sem infraestrutura paga.
 *
 * O trabalho pesado já roda na própria função serverless; o que faltava era
 * apenas o GATILHO. Dois gatilhos gratuitos servem, e o mesmo endpoint atende
 * os dois:
 *
 *   - Vercel Cron no plano Hobby: 1x por dia, com precisão de hora;
 *   - pg_cron do Supabase: qualquer frequência, incluído em todos os planos.
 *
 * Nada disso exige Redis, fila ou worker dedicado.
 */

export type RefreshSchedule = "manual" | "hourly" | "daily" | "weekly";

export const REFRESH_SCHEDULE_LABEL: Record<RefreshSchedule, string> = {
  manual: "Somente quando eu pedir",
  hourly: "A cada hora",
  daily: "Uma vez por dia",
  weekly: "Uma vez por semana",
};

const HOUR_MS = 60 * 60 * 1000;

const INTERVAL_MS: Record<Exclude<RefreshSchedule, "manual">, number> = {
  hourly: HOUR_MS,
  daily: 24 * HOUR_MS,
  weekly: 7 * 24 * HOUR_MS,
};

/**
 * Quando a próxima atualização deve acontecer.
 *
 * Conta a partir de agora, e não do horário previsto anterior: se o gatilho
 * atrasou (o Hobby da Vercel tem precisão de ±59 min), somar ao previsto
 * antigo faria os horários irem se acumulando para trás até dispararem duas
 * vezes seguidas.
 */
export function nextRefreshAt(
  schedule: RefreshSchedule,
  from: Date = new Date()
): Date | null {
  if (schedule === "manual") return null;
  return new Date(from.getTime() + INTERVAL_MS[schedule]);
}

/** Já passou da hora? Sem horário marcado, nunca está vencido. */
export function isDue(nextRefresh: string | null | undefined, now: Date = new Date()): boolean {
  if (!nextRefresh) return false;
  const due = new Date(nextRefresh).getTime();
  return Number.isFinite(due) && due <= now.getTime();
}

export function isValidSchedule(value: unknown): value is RefreshSchedule {
  return typeof value === "string" && value in REFRESH_SCHEDULE_LABEL;
}
