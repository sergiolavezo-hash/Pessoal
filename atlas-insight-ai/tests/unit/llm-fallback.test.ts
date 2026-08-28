import { describe, expect, it, vi } from "vitest";
import { FallbackLLMProvider } from "@/ai/llm/fallback";
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
