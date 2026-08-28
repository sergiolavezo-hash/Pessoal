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

// Defeito observado em produção: o primeiro provedor consumia TODO o
// orçamento tentando seus modelos, e os seguintes — que respondem em menos
// de um segundo — nunca eram chamados.
describe("repartição do tempo entre provedores", () => {
  it("dá uma fatia a cada provedor em vez do orçamento inteiro", async () => {
    const seen: number[] = [];
    const slow: LLMProvider = {
      name: "lento",
      model: "lento",
      complete: async (req) => {
        seen.push(req.deadline ?? 0);
        throw new LLMError("lento 429 quota", "lento", true);
      },
    };
    const fast: LLMProvider = {
      name: "rapido",
      model: "rapido",
      complete: async (req) => {
        seen.push(req.deadline ?? 0);
        return { text: '{"ok":1}', model: "rapido", inputTokens: 1, outputTokens: 1 };
      },
    };
    const chain = new FallbackLLMProvider([slow, fast]);
    const globalDeadline = Date.now() + 30_000;
    const res = await chain.complete({ ...request, deadline: globalDeadline });

    expect(res.text).toContain("ok");
    expect(seen).toHaveLength(2);
    // O primeiro recebeu no máximo a metade, não os 30s inteiros.
    expect(seen[0]).toBeLessThan(globalDeadline - 10_000);
    // E ainda sobrou tempo real para o segundo.
    expect(seen[1]).toBeGreaterThan(Date.now());
  });

  it("garante um mínimo utilizável mesmo com muitos provedores", async () => {
    const deadlines: number[] = [];
    const providers: LLMProvider[] = Array.from({ length: 6 }, (_, i) => ({
      name: `p${i}`,
      model: `p${i}`,
      complete: async (req) => {
        deadlines.push((req.deadline ?? 0) - Date.now());
        throw new LLMError(`p${i} 429 quota`, `p${i}`, true);
      },
    }));
    const chain = new FallbackLLMProvider(providers);
    await expect(chain.complete({ ...request, deadline: Date.now() + 20_000 })).rejects.toThrow();
    for (const d of deadlines) expect(d).toBeGreaterThanOrEqual(3_000);
  });
});
