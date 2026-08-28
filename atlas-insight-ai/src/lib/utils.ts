import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatValue } from "@/dashboards/format";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ponte para o formatador dos painéis. Existia uma segunda implementação aqui,
 * em en-US e dólar: dois formatadores discordando é como o mesmo número
 * aparece de dois jeitos em telas vizinhas — e como um valor em reais vira
 * "$1,234" na cara do usuário.
 */
export function formatNumber(value: number, format?: string): string {
  return formatValue(value, format);
}

/** Tempo decorrido em português — o produto inteiro fala pt-BR. */
export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dia${days === 1 ? "" : "s"}`;
  return d.toLocaleDateString("pt-BR");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Estados de objeto na língua do produto. */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
  ACTIVE: "Ativo",
  READY: "Pronto",
  PROCESSING: "Processando",
  FAILED: "Falhou",
  ERROR: "Erro",
  PENDING: "Pendente",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
