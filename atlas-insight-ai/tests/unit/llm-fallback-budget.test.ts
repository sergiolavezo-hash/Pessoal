import { describe, expect, it, vi, afterEach } from "vitest";
import { FallbackLLMProvider } from "@/ai/llm/fallback";
import { LLMError, remainingMs, type LLMProvider, type LLMRequest } from "@/ai/llm/types";
import { resetBreaker } from "@/ai/llm/circuit-breaker";

/**
 * Regressão: o orçamento era repartido por igual entre os provedores, então
 * com 38s e cinco provedores cada um recebia ~7,6s e era abortado no meio.
 * Nenhuma geração real cabe nisso — os cinco falhavam por prazo e o usuário
 * via "nenhum provedor respondeu" com todos os provedores saudáveis.
 */

const NAMES = ["groq", "google", "openai", "anthropic", "cerebras"];

/** Provedor que só responde se receber pelo menos `needsMs` de prazo. */
function slowProvider(name: string, needsMs: number): LLMProvider {
  return {
    name,
    model: `${name}-model`,
    async complete(request: LLMRequest) {
      const left = remainingMs(request.deadline);
      if (left < needsMs) {
        throw new LLMError(`${name}: tempo esgotado (recebeu ${Math.round(left)}ms)`, name, true);
      }
      return { text: "ok", model: name, provider: name, inputTokens: 1, outputTokens: 1 };
    },
  };
}

/** Falha imediata, como um 401/429 real (volta em milissegundos). */
function failsFast(name: string): LLMProvider {
  return {
    name,
    model: `${name}-model`,
    async complete() {
      throw new LLMError(`${name}: 401 unauthorized`, name, false);
    },
  };
}

afterEach(() => {
  NAMES.forEach(resetBreaker);
  vi.restoreAllMocks();
});

describe("FallbackLLMProvider — repartição do prazo", () => {
  it("dá ao primeiro provedor tempo suficiente para uma geração real", async () => {
    // 20s é um tempo plausível para gerar um painel; sob a divisão antiga o
    // primeiro recebia ~7,6s e falhava.
    const chain = new FallbackLLMProvider(NAMES.map((n) => slowProvider(n, 20_000)));
    const response = await chain.complete({
      messages: [{ role: "user", content: "gere um painel" }],
      deadline: Date.now() + 38_000,
    });
    expect(response.provider).toBe("groq");
  });

  it("ainda percorre a cadeia inteira quando as falhas são rápidas", async () => {
    // Quatro chaves inválidas seguidas de um provedor bom: o último precisa
    // ser alcançado E receber tempo de sobra.
    const chain = new FallbackLLMProvider([
      ...NAMES.slice(0, 4).map(failsFast),
      slowProvider("cerebras", 20_000),
    ]);
    const response = await chain.complete({
      messages: [{ role: "user", content: "oi" }],
      deadline: Date.now() + 38_000,
    });
    expect(response.provider).toBe("cerebras");
  });

  it("guarda tempo para o provedor seguinte quando o primeiro estoura o prazo", async () => {
    // O primeiro consome tudo o que recebe; o segundo precisa sobreviver.
    const hog: LLMProvider = {
      name: "groq",
      model: "groq-model",
      async complete(request) {
        const left = remainingMs(request.deadline);
        await new Promise((r) => setTimeout(r, Math.min(left, 60)));
        throw new LLMError("groq: tempo esgotado", "groq", true);
      },
    };
    const chain = new FallbackLLMProvider([hog, slowProvider("google", 1_000)]);
    const response = await chain.complete({
      messages: [{ role: "user", content: "oi" }],
      deadline: Date.now() + 38_000,
    });
    expect(response.provider).toBe("google");
  });

  it("sem prazo definido, nenhum provedor é limitado", async () => {
    const chain = new FallbackLLMProvider([slowProvider("groq", 60_000)]);
    const response = await chain.complete({ messages: [{ role: "user", content: "oi" }] });
    expect(response.provider).toBe("groq");
  });
});
