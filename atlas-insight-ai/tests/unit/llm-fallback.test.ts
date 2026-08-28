import { describe, expect, it, vi } from "vitest";
import { FallbackLLMProvider, retryHint } from "@/ai/llm/fallback";
import { __resetAllBreakers } from "@/ai/llm/circuit-breaker";
import { LLMError, type LLMProvider, type LLMResponse } from "@/ai/llm/types";

function provider(name: string, behaviour: () => Promise<LLMResponse>): LLMProvider {
  return { name, model: `${name}-model`, complete: vi.fn(behaviour) };
}

const answer = (name: string): LLMResponse => ({
  text: `{"from":"${name}"}`,
  model: name,
  inputTokens: 1,
  outputTokens: 1,
});

const request = { messages: [{ role: "user" as const, content: "hi" }] };

describe("FallbackLLMProvider", () => {
  it("uses the first provider that answers", async () => {
    const second = provider("openai", async () => answer("openai"));
    const chain = new FallbackLLMProvider([
      provider("google", async () => answer("google")),
      second,
    ]);
    expect((await chain.complete(request)).text).toContain("google");
    expect(second.complete).not.toHaveBeenCalled();
  });

  it("fails over when a provider runs out of quota", async () => {
    const chain = new FallbackLLMProvider([
      provider("google", async () => {
        throw new LLMError("Google AI API error 429: quota exceeded", "google", true);
      }),
      provider("openai", async () => answer("openai")),
    ]);
    expect((await chain.complete(request)).text).toContain("openai");
  });

  it("fails over on credit and auth problems even if not marked retryable", async () => {
    const chain = new FallbackLLMProvider([
      provider("anthropic", async () => {
        throw new LLMError("400 credit balance is too low", "anthropic", false);
      }),
      provider("google", async () => answer("google")),
    ]);
    expect((await chain.complete(request)).text).toContain("google");
  });

  it("does not waste other providers on a genuinely bad request", async () => {
    const second = provider("openai", async () => answer("openai"));
    const chain = new FallbackLLMProvider([
      provider("google", async () => {
        throw new LLMError("Response contains malformed JSON", "google", false);
      }),
      second,
    ]);
    await expect(chain.complete(request)).rejects.toThrow(/malformed JSON/);
    expect(second.complete).not.toHaveBeenCalled();
  });

  it("only reports exhaustion after trying every provider", async () => {
    const providers = ["google", "openai", "anthropic"].map((n) =>
      provider(n, async () => {
        throw new LLMError(`${n} 429 quota`, n, true);
      })
    );
    const chain = new FallbackLLMProvider(providers);
    await expect(chain.complete(request)).rejects.toThrow(/sem capacidade neste momento/i);
    for (const p of providers) expect(p.complete).toHaveBeenCalledOnce();
  });

  it("refuses to be built with no providers", () => {
    expect(() => new FallbackLLMProvider([])).toThrow(/No LLM provider/);
  });
});

describe("mensagem quando ninguém tem capacidade", () => {
  it("diz em quanto tempo o provedor volta", async () => {
    __resetAllBreakers();
    const chain = new FallbackLLMProvider([
      provider("groq", async () => {
        throw new LLMError("Rate limit reached. Please try again in 42s", "groq", true);
      }),
      provider("google", async () => {
        throw new LLMError("Google AI API error 429: quota exceeded", "google", true);
      }),
    ]);
    // Prazo curto: não deve entrar no caminho de esperar-e-tentar-de-novo.
    await expect(chain.complete({ ...request, deadline: Date.now() + 8_000 })).rejects.toThrow(
      /Tente de novo em \d+ segundos?\./
    );
    __resetAllBreakers();
  });

  it("cai para 'em instantes' quando não há prazo conhecido", () => {
    __resetAllBreakers();
    expect(retryHint([{ name: "x", model: "m", complete: async () => answer("x") }])).toBe(
      "Tente de novo em instantes."
    );
  });
});
