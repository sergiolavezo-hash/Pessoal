import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetAllBreakers,
  isCapacityError,
  isTripped,
  parseRetryAfterMs,
  resetBreaker,
  tripBreaker,
} from "@/ai/llm/circuit-breaker";
import { FallbackLLMProvider } from "@/ai/llm/fallback";
import { LLMError, type LLMProvider } from "@/ai/llm/types";

afterEach(() => __resetAllBreakers());

const request = { messages: [{ role: "user" as const, content: "oi" }] };

describe("parseRetryAfterMs", () => {
  it("entende a espera sugerida pelos provedores", () => {
    expect(parseRetryAfterMs("Rate limit reached. Please try again in 7.2s")).toBe(7200);
    expect(parseRetryAfterMs('"retryDelay": "50s"')).toBe(50_000);
    expect(parseRetryAfterMs("Please try again in 2m")).toBe(120_000);
    expect(parseRetryAfterMs("erro qualquer")).toBeNull();
  });
});

describe("isCapacityError", () => {
  it("separa falta de capacidade de pedido inválido", () => {
    expect(isCapacityError("API error 429: quota exceeded")).toBe(true);
    expect(isCapacityError("Request too large for model")).toBe(true);
    expect(isCapacityError("credit balance is too low")).toBe(true);
    expect(isCapacityError("Response contains malformed JSON")).toBe(false);
  });
});

describe("disjuntor", () => {
  it("mantém o provedor em descanso e o libera depois", () => {
    tripBreaker("groq", "try again in 1s");
    expect(isTripped("groq")).toBe(true);
    expect(isTripped("groq", Date.now() + 2_000)).toBe(false);
  });

  it("uma resposta boa libera o provedor", () => {
    tripBreaker("google", "429 quota");
    expect(isTripped("google")).toBe(true);
    resetBreaker("google");
    expect(isTripped("google")).toBe(false);
  });
});

describe("cadeia com disjuntor", () => {
  function provider(name: string, behaviour: () => Promise<never> | Promise<{ text: string; model: string; inputTokens: number; outputTokens: number }>) {
    return { name, model: name, complete: vi.fn(behaviour) } as unknown as LLMProvider & {
      complete: ReturnType<typeof vi.fn>;
    };
  }

  it("não repete um provedor sabidamente esgotado no pedido seguinte", async () => {
    const esgotado = provider("google", async () => {
      throw new LLMError("Google AI API error 429: quota, retryDelay: 60s", "google", true);
    });
    const bom = provider("groq", async () => ({
      text: '{"ok":1}',
      model: "groq",
      inputTokens: 1,
      outputTokens: 1,
    }));
    const chain = new FallbackLLMProvider([esgotado, bom]);

    await chain.complete(request);
    expect(esgotado.complete).toHaveBeenCalledTimes(1);

    // Segundo pedido: o esgotado é pulado, não custa mais tempo a ninguém.
    await chain.complete(request);
    expect(esgotado.complete).toHaveBeenCalledTimes(1);
    expect(bom.complete).toHaveBeenCalledTimes(2);
  });

  it("ainda tenta todos quando TODOS estão em descanso", async () => {
    const a = provider("google", async () => {
      throw new LLMError("429 quota", "google", true);
    });
    const b = provider("groq", async () => {
      throw new LLMError("429 quota", "groq", true);
    });
    const chain = new FallbackLLMProvider([a, b]);
    await expect(chain.complete(request)).rejects.toThrow();
    // Ambos em descanso: recusar sem tentar seria pior que tentar.
    await expect(chain.complete(request)).rejects.toThrow();
    expect(a.complete).toHaveBeenCalledTimes(2);
    expect(b.complete).toHaveBeenCalledTimes(2);
  });
});
