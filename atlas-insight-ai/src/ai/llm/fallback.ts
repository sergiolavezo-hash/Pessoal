import "server-only";
import {
  LLMError,
  remainingMs,
  type LLMProvider,
  type LLMRequest,
  type LLMResponse,
} from "@/ai/llm/types";
import {
  isCapacityError,
  isTripped,
  resetBreaker,
  tripBreaker,
  trippedUntil,
} from "@/ai/llm/circuit-breaker";
import { formatWait } from "@/lib/wait-time";

/**
 * Encadeia todos os provedores configurados. Cotas gratuitas se esgotam (o
 * Gemini Flash permite poucas requisições por dia) e um provedor fora do ar
 * não pode derrubar o produto: só devolvemos erro depois de tentar TODOS.
 */
/**
 * Tempo mínimo que vale a pena dar a um provedor. Abaixo disso, tentar só
 * consome o que resta sem chance real de resposta.
 */
const MIN_PROVIDER_SLICE_MS = 6_000;

/**
 * Tempo guardado para o provedor seguinte quando o atual falha.
 *
 * Este número fica entre dois defeitos reais, um de cada lado:
 *
 *  - reserva de menos: o primeiro provedor consome o orçamento inteiro
 *    tentando seus modelos e os seguintes — que responderiam em menos de um
 *    segundo — nunca chegam a ser chamados;
 *  - reserva de mais: sobra tão pouco para quem está de fato respondendo que
 *    a chamada é abortada no meio, e o usuário vê "nenhum provedor
 *    respondeu" com todos os provedores saudáveis.
 *
 * 12s cobrem uma tentativa útil do suplente e ainda deixam ~26s do orçamento
 * de 38s para o provedor da vez concluir uma geração real.
 */
const NEXT_ATTEMPT_RESERVE_MS = 12_000;

/**
 * Limites por MINUTO (como o do Groq) se renovam sozinhos em segundos.
 * Quando todos os provedores recusaram por falta de capacidade e a espera
 * cabe no prazo, esperar e tentar de novo transforma uma falha em resposta —
 * exatamente o caso de varios clientes usando o produto ao mesmo tempo.
 */
const MAX_WAIT_FOR_CAPACITY_MS = 12_000;

export class FallbackLLMProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;

  constructor(private readonly providers: LLMProvider[]) {
    if (providers.length === 0) throw new LLMError("No LLM provider configured", "fallback");
    this.name = providers[0].name;
    this.model = providers[0].model;
  }

  async complete(request: LLMRequest, retried = false): Promise<LLMResponse> {
    const errors: string[] = [];

    // Provedores que já se sabem esgotados vão para o fim da fila em vez de
    // consumirem o prazo. Se TODOS estiverem em descanso, a ordem original
    // é mantida — tentar é melhor do que recusar sem tentar.
    const available = this.providers.filter((p) => !isTripped(p.name));
    const resting = this.providers.filter((p) => isTripped(p.name));
    const queue = available.length > 0 ? [...available, ...resting] : this.providers;

    for (const [index, provider] of queue.entries()) {
      const left = remainingMs(request.deadline);
      if (left <= MIN_PROVIDER_SLICE_MS) {
        errors.push("prazo esgotado antes de tentar os demais provedores");
        break;
      }

      // Dá a esta tentativa quase todo o tempo restante, guardando apenas uma
      // reserva para a próxima.
      //
      // Repartir o orçamento por igual entre os provedores parecia justo, mas
      // garantia a falha: com 38s e cinco provedores, cada um recebia ~7,6s e
      // era abortado no meio — nenhuma geração real termina nesse tempo, então
      // os cinco falhavam por prazo e o usuário via "nenhum provedor
      // respondeu" mesmo com todos saudáveis.
      //
      // As falhas que valem trocar de provedor (401, 402, 429, conexão
      // recusada, modelo inexistente) voltam em milissegundos: reservar tempo
      // para elas custa quase nada. Já um provedor que está de fato
      // respondendo precisa do orçamento inteiro — cortá-lo para preservar
      // suplentes troca uma resposta certa por cinco erros.
      const isLast = index === queue.length - 1;
      const slice = Number.isFinite(left)
        ? isLast
          ? left
          : Math.max(left - NEXT_ATTEMPT_RESERVE_MS, MIN_PROVIDER_SLICE_MS)
        : undefined;
      const attempt =
        slice == null ? request : { ...request, deadline: Date.now() + Math.min(slice, left) };

      try {
        const response = await provider.complete(attempt);
        resetBreaker(provider.name);
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${provider.name}: ${message.slice(0, 200)}`);
        // Sem capacidade: guarda por quanto tempo não vale a pena insistir,
        // para os próximos pedidos não pagarem essa espera de novo.
        if (isCapacityError(message)) {
          tripBreaker(provider.name, message);
          const until = trippedUntil(provider.name);
          console.warn(
            `[llm] ${provider.name} sem capacidade; em descanso por ${
              until ? Math.round((until - Date.now()) / 1000) : "?"
            }s`
          );
        }
        // Erro definitivo do pedido (ex.: prompt inválido) não melhora
        // trocando de provedor — só insistimos quando faz sentido.
        if (error instanceof LLMError && !error.retryable && !isWorthFailingOver(message)) {
          throw error;
        }
        console.warn(`[llm] ${provider.name} failed, trying next provider: ${message.slice(0, 200)}`);
      }
    }

    // Todos recusaram por capacidade: se algum volta logo e ainda há prazo,
    // vale esperar em vez de devolver erro ao usuário.
    if (!retried && errors.length > 0 && errors.every((e) => isCapacityError(e))) {
      const soonest = queue
        .map((p) => trippedUntil(p.name))
        .filter((t): t is number => t != null)
        .sort((a, b) => a - b)[0];
      const wait = soonest != null ? soonest - Date.now() : null;
      const budget = remainingMs(request.deadline);
      if (
        wait != null &&
        wait > 0 &&
        wait <= MAX_WAIT_FOR_CAPACITY_MS &&
        budget > wait + MIN_PROVIDER_SLICE_MS
      ) {
        console.warn(`[llm] sem capacidade agora; aguardando ${Math.round(wait / 1000)}s`);
        await new Promise((resolve) => setTimeout(resolve, wait + 250));
        return this.complete(request, true);
      }
    }

    // Mensagem acionável: o usuário precisa saber o que fazer, não ler o
    // erro cru de cada fornecedor (que fica no log do servidor).
    console.error(`[llm] every provider failed: ${errors.join(" | ")}`);
    // Mesmo critério do disjuntor: se ele considerou "sem capacidade" a ponto
    // de pôr o provedor em descanso, a mensagem ao usuário tem de dizer o
    // mesmo — e dizer quando volta.
    const allOutOfQuota = errors.every((e) => isCapacityError(e));
    throw new LLMError(
      allOutOfQuota
        ? `Todos os provedores de IA estão sem capacidade neste momento. ${retryHint(
            this.providers
          )} Se precisar continuar agora, adicione créditos em Configurações → Cobrança.`
        : `Nenhum provedor de IA conseguiu responder agora. Tente novamente em alguns instantes. (${errors.length} tentativa(s))`,
      "fallback",
      true
    );
  }
}

/**
 * Falhas que valem trocar de provedor mesmo quando não vieram marcadas como
 * recuperáveis: cota, crédito, autenticação e modelo indisponível.
 */
function isWorthFailingOver(message: string): boolean {
  return /\b(429|402|401|403|404|quota|rate limit|credit balance|insufficient|unavailable|overloaded|not configured)\b/i.test(
    message
  );
}

/**
 * Uma espera com prazo é aceitável; sem prazo, o produto parece quebrado.
 * O disjuntor já sabe quando cada provedor volta — o mais próximo é o
 * momento em que vale a pena tentar de novo.
 */
export function retryHint(providers: LLMProvider[]): string {
  const soonest = providers
    .map((p) => trippedUntil(p.name))
    .filter((t): t is number => t != null)
    .sort((a, b) => a - b)[0];
  if (soonest == null) return "Tente de novo em instantes.";
  return `Tente de novo ${formatWait(soonest - Date.now())}.`;
}
