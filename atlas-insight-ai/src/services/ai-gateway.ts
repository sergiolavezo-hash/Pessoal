import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/services/api-context";
import { tenantLimits, type AiOperation } from "@/ai/config";
import { formatWait, msUntilDailyReset, dailyResetClock } from "@/lib/wait-time";

/**
 * Portaria das chamadas de IA.
 *
 * As camadas gratuitas dos provedores têm teto por CHAVE de API, somando todos
 * os clientes: na Groq, 200.000 tokens e 1.000 requisições por dia para o
 * projeto inteiro. Um cliente sozinho consegue esgotar isso em minutos e
 * deixar todos os outros sem IA. A portaria dá a cada organização uma fatia
 * própria — requisições por minuto, chamadas simultâneas e tokens por dia — e
 * recusa o excedente antes de gastar qualquer token.
 *
 * A contabilidade acontece toda no banco (migração 0016) porque precisa ser
 * atômica: dois pedidos simultâneos do mesmo cliente não podem ler o mesmo
 * contador antes de qualquer um deles incrementar.
 */

export interface AdmissionTicket {
  /** Identifica a vaga reservada; precisa ser devolvida ao terminar. */
  lease: string | null;
  organizationId: string;
}

interface AdmitResponse {
  allowed: boolean;
  reason?: string;
  lease?: string;
  retry_after_seconds?: number;
  day_tokens?: number;
  daily_limit?: number;
  running?: number;
  limit?: number;
}

/**
 * Estimativa de tokens da chamada, usada só para reservar espaço no orçamento
 * diário antes de gastá-lo. Aproximação usual: ~4 caracteres por token.
 */
export function estimateTokens(prompt: string, maxOutputTokens: number): number {
  return Math.ceil(prompt.length / 4) + maxOutputTokens;
}

/**
 * Pede permissão para uma chamada de IA. Lança 429 quando o cliente já usou
 * a fatia dele — sem nunca tocar no provedor.
 */
export async function admit(
  organizationId: string,
  operation: AiOperation,
  estimatedTokens: number
): Promise<AdmissionTicket> {
  const limits = tenantLimits();
  const { data, error } = await createAdminClient().rpc("ai_gateway_admit", {
    org: organizationId,
    rpm: limits.requestsPerMinute,
    max_concurrent: limits.concurrentRequests,
    daily_tokens: limits.dailyTokens,
    est_tokens: estimatedTokens,
    op: operation,
  });

  if (error) {
    // A portaria existe para conter custo. Se ela não responde, não há como
    // saber se este cliente ainda tem fatia — e liberar "na dúvida" é
    // exatamente como uma conta gratuita vira uma fatura. Recusar é a
    // escolha segura, e a mensagem diz que é temporário.
    console.error(`[ai-gateway] admission unavailable: ${error.message}`);
    throw new ApiError(
      503,
      "O controle de uso de IA está indisponível no momento. Tente de novo em instantes."
    );
  }

  const verdict = data as AdmitResponse;
  if (!verdict.allowed) throw admissionError(verdict);
  return { lease: verdict.lease ?? null, organizationId };
}

/** Devolve a vaga e contabiliza os tokens realmente gastos. */
export async function release(ticket: AdmissionTicket, usedTokens: number): Promise<void> {
  const { error } = await createAdminClient().rpc("ai_gateway_release", {
    org: ticket.organizationId,
    lease: ticket.lease,
    used_tokens: Math.max(0, Math.round(usedTokens)),
  });
  // A vaga tem validade própria no banco: se esta liberação falhar, ela se
  // limpa sozinha. Não vale derrubar o pedido do usuário por causa disso.
  if (error) console.warn(`[ai-gateway] release failed: ${error.message}`);
}

function admissionError(verdict: AdmitResponse): ApiError {
  switch (verdict.reason) {
    case "rate_limited": {
      const seconds = verdict.retry_after_seconds ?? 60;
      return new ApiError(
        429,
        `Muitos pedidos de IA em sequência. Aguarde ${seconds}s e tente de novo.`
      );
    }
    case "too_many_concurrent":
      return new ApiError(
        429,
        `Você já tem ${verdict.running ?? "vários"} pedidos de IA em andamento. ` +
          "Aguarde um deles terminar antes de iniciar outro."
      );
    case "daily_tokens_exhausted":
      return new ApiError(
        429,
        `Sua cota diária de IA acabou. Ela se renova ${formatWait(msUntilDailyReset())}, ` +
          `às ${dailyResetClock()}. Para continuar agora, recarregue em Configurações → Cobrança.`
      );
    default:
      return new ApiError(429, "Limite de uso de IA atingido. Tente de novo em instantes.");
  }
}
