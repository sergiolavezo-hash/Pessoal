import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/services/api-context";
import { formatCents } from "@/services/ai-cost";

/**
 * Créditos de IA. A franquia diária do plano é consumida primeiro; depois, o
 * saldo comprado. Quando os dois acabam, o usuário recarrega pela própria
 * Atlas e continua trabalhando. Toda a aritmética acontece no banco (migração
 * 0012) para ser atômica sob uso simultâneo.
 */

export interface AiCreditStatus {
  allowed: boolean;
  daily_allowance_cents: number;
  daily_remaining_cents: number;
  balance_cents: number;
  total_available_cents: number;
  day_spent_cents: number;
}

/** Carteira ainda não provisionada (migração pendente) não bloqueia o uso. */
const PERMISSIVE: AiCreditStatus = {
  allowed: true,
  daily_allowance_cents: 0,
  daily_remaining_cents: 0,
  balance_cents: 0,
  total_available_cents: 0,
  day_spent_cents: 0,
};

export async function getCreditStatus(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AiCreditStatus> {
  const { data, error } = await supabase.rpc("ai_credits_status", { org: organizationId });
  if (error) {
    console.warn(`[ai-credits] status unavailable: ${error.message}`);
    return PERMISSIVE;
  }
  return data as AiCreditStatus;
}

/** Debita o custo de uma execução. Falhas nunca derrubam o pedido do usuário. */
export async function chargeAiUsage(
  supabase: SupabaseClient,
  organizationId: string,
  cents: number,
  runId?: string,
  note?: string
): Promise<void> {
  if (cents <= 0) return;
  const { error } = await supabase.rpc("ai_credits_consume", {
    org: organizationId,
    cents,
    run: runId ?? null,
    note: note ?? null,
  });
  if (error) console.error(`[ai-credits] charge failed: ${error.message}`);
}

/** Credita uma recarga aprovada. Idempotente pela referência do pagamento. */
export async function addCredits(
  supabase: SupabaseClient,
  organizationId: string,
  cents: number,
  options: { kind?: string; reference?: string; note?: string } = {}
): Promise<AiCreditStatus> {
  const { data, error } = await supabase.rpc("ai_credits_add", {
    org: organizationId,
    cents,
    entry_kind: options.kind ?? "purchase",
    reference: options.reference ?? null,
    note: options.note ?? null,
  });
  if (error) throw new ApiError(500, `Falha ao creditar: ${error.message}`);
  return data as AiCreditStatus;
}

/** Bloqueia com 402 e uma mensagem que diz o que fazer. */
export function assertHasCredits(status: AiCreditStatus): void {
  if (status.allowed) return;
  throw new ApiError(
    402,
    `Sua cota diária de IA (${formatCents(status.daily_allowance_cents)}) acabou e não há saldo de créditos. ` +
      `Recarregue em Configurações → Cobrança para continuar agora, ou aguarde a renovação de amanhã.`
  );
}

/** Pacotes de recarga oferecidos na tela de cobrança. */
export interface CreditPack {
  id: string;
  name: string;
  /** Quanto o cliente paga. */
  priceCents: number;
  /** Quanto entra na carteira (bônus progressivo por volume). */
  creditCents: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "credits_20", name: "Recarga 20", priceCents: 2000, creditCents: 2000 },
  { id: "credits_50", name: "Recarga 50", priceCents: 5000, creditCents: 5500 },
  { id: "credits_100", name: "Recarga 100", priceCents: 10000, creditCents: 12000 },
];

export function findCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
