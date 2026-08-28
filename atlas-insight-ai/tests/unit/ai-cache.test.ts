import { describe, expect, it, vi } from "vitest";
import { cacheKey, singleFlight } from "@/services/ai-cache";
import { budgetFor, tenantLimits } from "@/ai/config";

describe("cacheKey", () => {
  it("ignores differences that do not change the answer", () => {
    const a = cacheKey("dashboard_generate", "v1", "Quero um painel de vendas");
    const b = cacheKey("dashboard_generate", "v1", "  quero um painel de VENDAS!  ");
    expect(a).toBe(b);
  });

  // Sem isto, um cliente poderia receber a resposta gerada sobre os dados de
  // outro: o esquema muda, a chave precisa mudar junto.
  it("separates different contexts and operations", () => {
    const base = cacheKey("dashboard_generate", "v1", "painel de vendas");
    expect(cacheKey("dashboard_generate", "v2", "painel de vendas")).not.toBe(base);
    expect(cacheKey("dashboard_edit", "v1", "painel de vendas")).not.toBe(base);
    expect(cacheKey("dashboard_generate", "v1", "painel de compras")).not.toBe(base);
  });

  it("treats accents as equivalent", () => {
    expect(cacheKey("chat", "v1", "faturamento do mês")).toBe(
      cacheKey("chat", "v1", "faturamento do mes")
    );
  });
});

describe("singleFlight", () => {
  // Duplo clique em "gerar painel" gerava duas chamadas ao provedor e cobrava
  // as duas. A segunda tem de esperar a primeira, não repeti-la.
  it("collapses concurrent identical calls into one", async () => {
    const fn = vi.fn(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("resultado"), 20))
    );

    const [a, b, c] = await Promise.all([
      singleFlight("k", fn),
      singleFlight("k", fn),
      singleFlight("k", fn),
    ]);

    expect(fn).toHaveBeenCalledTimes(1);
    expect([a, b, c]).toEqual(["resultado", "resultado", "resultado"]);
  });

  it("does not collapse different keys", async () => {
    const fn = vi.fn(async () => "x");
    await Promise.all([singleFlight("a", fn), singleFlight("b", fn)]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  // Se a chave ficasse presa após uma falha, o pedido seguinte herdaria o erro.
  it("releases the key after a failure", async () => {
    const failing = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(singleFlight("k2", failing)).rejects.toThrow("boom");

    const ok = vi.fn(async () => "ok");
    await expect(singleFlight("k2", ok)).resolves.toBe("ok");
    expect(ok).toHaveBeenCalledTimes(1);
  });
});

describe("orçamento por operação", () => {
  /**
   * A camada gratuita da Groq recusa o pedido inteiro quando ele passa de
   * 8.000 tokens por minuto contando entrada e saída. Um teto de saída acima
   * disso não trunca a resposta: derruba a chamada.
   */
  it("keeps every output ceiling inside the free-tier per-minute limit", () => {
    const operations = [
      "dashboard_generate",
      "dashboard_edit",
      "sql_generate",
      "chat",
      "insight",
      "business_rule_parse",
      "analyze",
      "document_extract",
    ] as const;
    for (const op of operations) {
      expect(budgetFor(op).maxOutputTokens).toBeLessThanOrEqual(4000);
      expect(budgetFor(op).maxAttempts).toBeGreaterThanOrEqual(1);
      expect(budgetFor(op).maxAttempts).toBeLessThanOrEqual(3);
    }
  });

  it("gives 100 tenants room inside the daily free-tier budget", () => {
    // 200.000 tokens/dia é o teto da chave na Groq, somando todos os clientes.
    expect(tenantLimits().dailyTokens * 100).toBeLessThanOrEqual(200_000);
  });
});
