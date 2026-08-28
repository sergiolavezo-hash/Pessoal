import "server-only";
import { LLMError, type LLMProvider, type LLMRequest, type LLMResponse } from "@/ai/llm/types";

/**
 * Encadeia todos os provedores configurados. Cotas gratuitas se esgotam (o
 * Gemini Flash permite poucas requisições por dia) e um provedor fora do ar
 * não pode derrubar o produto: só devolvemos erro depois de tentar TODOS.
 */
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

    for (const provider of this.providers) {
      try {
        return await provider.complete(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${provider.name}: ${message.slice(0, 200)}`);
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
