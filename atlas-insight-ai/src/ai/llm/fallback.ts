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

export class FallbackLLMProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;

  constructor(private readonly providers: LLMProvider[]) {
    if (providers.length === 0) throw new LLMError("No LLM provider configured", "fallback");
    this.name = providers[0].name;
    this.model = providers[0].model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
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

      // Reparte o tempo restante entre os provedores que ainda faltam. Sem
      // isto, o primeiro da fila consome tudo e os seguintes — que poderiam
      // responder em menos de um segundo — nunca chegam a ser chamados.
      const providersLeft = queue.length - index;
      const slice = Number.isFinite(left)
        ? Math.max(Math.floor(left / providersLeft), MIN_PROVIDER_SLICE_MS)
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

    // Mensagem acionável: o usuário precisa saber o que fazer, não ler o
    // erro cru de cada fornecedor (que fica no log do servidor).
    console.error(`[llm] every provider failed: ${errors.join(" | ")}`);
    const allOutOfQuota = errors.every((e) => /429|quota|credit|insufficient/i.test(e));
    throw new LLMError(
      allOutOfQuota
        ? "A cota de todos os provedores de IA configurados se esgotou. Adicione créditos (ou uma nova chave) em Configurações para voltar a gerar painéis."
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
