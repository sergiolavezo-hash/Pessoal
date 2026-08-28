import { describe, expect, it, vi } from "vitest";
import { FallbackLLMProvider } from "@/ai/llm/fallback";
import { LLMError, remainingMs, type LLMProvider } from "@/ai/llm/types";

const request = { messages: [{ role: "user" as const, content: "oi" }] };

describe("remainingMs", () => {
  it("is unbounded without a deadline", () => {
    expect(remainingMs(undefined)).toBe(Number.POSITIVE_INFINITY);
  });
  it("counts down to the deadline", () => {
    expect(remainingMs(Date.now() + 5_000)).toBeGreaterThan(4_000);
    expect(remainingMs(Date.now() - 1)).toBeLessThanOrEqual(0);
  });
});

describe("FallbackLLMProvider com prazo", () => {
  // Sem prazo, a cadeia tentava provedor após provedor até a plataforma
  // matar a função — e o usuário recebia uma página de erro, não JSON.
  it("stops trying providers once the deadline passed", async () => {
    const second = { name: "b", model: "b", complete: vi.fn(async () => ({ text: "{}", model: "b", inputTokens: 0, outputTokens: 0 })) };
    const chain = new FallbackLLMProvider([
      {
        name: "a",
        model: "a",
        complete: async () => {
          throw new LLMError("a 429 quota", "a", true);
        },
      } as LLMProvider,
      second as LLMProvider,
    ]);
    await expect(chain.complete({ ...request, deadline: Date.now() - 1 })).rejects.toThrow();
    expect(second.complete).not.toHaveBeenCalled();
  });

  it("still uses the whole chain when there is time left", async () => {
    const chain = new FallbackLLMProvider([
      {
        name: "a",
        model: "a",
        complete: async () => {
          throw new LLMError("a 429 quota", "a", true);
        },
      } as LLMProvider,
      {
        name: "b",
        model: "b",
        complete: async () => ({ text: '{"ok":1}', model: "b", inputTokens: 1, outputTokens: 1 }),
      } as LLMProvider,
    ]);
    const res = await chain.complete({ ...request, deadline: Date.now() + 30_000 });
    expect(res.text).toContain("ok");
  });
});
