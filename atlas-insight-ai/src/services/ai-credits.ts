import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/services/api-context";
import { formatCents } from "@/services/ai-cost";
import { dailyResetClock, formatWait, msUntilDailyReset } from "@/lib/wait-time";

/**
 * Créditos de IA. A franquia diária do plano é consumida primeiro; depois, o
 * saldo comprado. Quando os dois acabam, o usuário recarrega pela própria
 * Atlas e continua trabalhando. Toda a aritmética acontece no banco (migração
 * 0012) para ser atômica sob uso simultâneo.
 */

/**
 * 1 crédito = 1 centavo de custo real de IA (provedor + margem).
 *
 * Não é moeda inventada: 500 créditos são R$ 5,00 de IA de verdade. Manter a
 * unidade colada ao custo é o que deixa o extrato conciliável e impede a
 * conta do produto de mentir para dentro.
 */
export const CENTS_PER_CREDIT = 1;

export function toCredits(cents: number): number {
  return Math.round(cents / CENTS_PER_CREDIT);
}

export interface AiCreditStatus {
  allowed: boolean;
  daily_allowance_cents: number;
  daily_remaining_cents: number;
  balance_cents: number;
  total_available_cents: number;
  day_spent_cents: number;
}

/**
 * Resposta usada quando a carteira não pôde ser consultada.
 *
 * Antes este objeto vinha com `allowed: true`: qualquer falha na consulta
 * liberava IA sem limite, que é exatamente como uma conta gratuita vira uma
 * fatura. Na dúvida sobre o saldo, o certo é não gastar — a mensagem deixa
 * claro que é temporário, e uma indisponibilidade de segundos custa menos que
 * uma cota esgotada por todos os clientes.
 */
const UNAVAILABLE: AiCreditStatus = {
  allowed: false,
  daily_allowance_cents: 0,
  daily_remaining_cents: 0,
  balance_cents: 0,
  total_available_cents: 0,
  day_spent_cents: 0,
};

/**
 * As funções de carteira são SECURITY DEFINER e recebem a organização por
 * parâmetro: só o service role pode executá-las. Chamá-las com o cliente do
 * usuário falhava silenciosamente — o consumo nunca era debitado.
 */
export async function getCreditStatus(organizationId: string): Promise<AiCreditStatus> {
  const admin = createAdminClient();

  // A franquia é atributo do PLANO, não da carteira. Sincronizar aqui é o que
  // faz assinar (ou cancelar) valer na hora, sem job nenhum — e é o que
  // provisiona a carteira de uma organização nova, que antes só nascia no
  // primeiro consumo e até lá não tinha o que mostrar na tela.
  const { error: syncError } = await admin.rpc("ai_credits_sync_plan", { org: organizationId });
  if (syncError && syncError.code !== "42883" && syncError.code !== "PGRST202") {
    console.error(`[ai-credits] sync de plano falhou: ${syncError.message}`);
  }

  const { data, error } = await admin.rpc("ai_credits_status", {
    org: organizationId,
  });
  if (error) {
    // Carteira ainda não provisionada (migração pendente) é um estado sem
    // ambiguidade e não deve derrubar o produto; qualquer outra falha é
    // ambígua quanto ao saldo, e aí o certo é não gastar.
    if (error.code === "42883" || error.code === "PGRST202") {
      console.warn("[ai-credits] carteira ainda não provisionada; seguindo sem cota");
      return { ...UNAVAILABLE, allowed: true };
    }
    console.error(`[ai-credits] status unavailable: ${error.message}`);
    return UNAVAILABLE;
  }
  return data as AiCreditStatus;
}

/** Debita o custo de uma execução. Falhas nunca derrubam o pedido do usuário. */
export async function chargeAiUsage(
  organizationId: string,
  cents: number,
  runId?: string,
  note?: string
): Promise<void> {
  if (cents <= 0) return;
  const { error } = await createAdminClient().rpc("ai_credits_consume", {
    org: organizationId,
    cents,
    run: runId ?? null,
    note: note ?? null,
  });
  if (error) console.error(`[ai-credits] charge failed: ${error.message}`);
}

/** Credita uma recarga aprovada. Idempotente pela referência do pagamento. */
export async function addCredits(
  organizationId: string,
  cents: number,
  options: { kind?: string; reference?: string; note?: string } = {}
): Promise<AiCreditStatus> {
  const { data, error } = await createAdminClient().rpc("ai_credits_add", {
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
  // Diz QUANDO volta, não só que acabou: uma espera com prazo é aceitável.
  const wait = formatWait(msUntilDailyReset());
  throw new ApiError(
    402,
    `Sua cota diária de IA (${formatCents(status.daily_allowance_cents)}) acabou e não há saldo de créditos. ` +
      `Ela se renova ${wait}, às ${dailyResetClock()}. ` +
      `Para continuar agora, recarregue em Configurações → Cobrança.`
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
