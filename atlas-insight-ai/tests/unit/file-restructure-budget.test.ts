import { describe, expect, it, vi, afterEach } from "vitest";

// O orçamento de tempo é o que impede o upload de morrer esperando a IA.
vi.mock("@/ai/llm", () => ({
  getLLMProvider: () => ({
    name: "lento",
    model: "teste",
    // Nunca responde: simula a cadeia de fallback tentando modelo após modelo.
    complete: () => new Promise(() => {}),
  }),
}));

const { analyzeFileLayout } = await import("@/ai/file-restructure");

afterEach(() => vi.useRealTimers());

describe("analyzeFileLayout", () => {
  it("gives up when the provider blows the time budget", async () => {
    const matrix = [["a", "b"], [1, 2]];
    const started = Date.now();
    await expect(analyzeFileLayout(matrix, "x.csv", 150)).rejects.toThrow(/exceeded 150ms/);
    // Falha rápido: o chamador cai no leitor heurístico e o upload segue.
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
