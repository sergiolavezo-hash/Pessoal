import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MARGIN_MULTIPLIER,
  DEFAULT_USD_TO_BRL,
  FALLBACK_PRICE,
  formatCents,
  marginMultiplier,
  priceFor,
  priceRun,
  providerCostUsd,
} from "@/services/ai-cost";

afterEach(() => {
  delete process.env.AI_MARGIN_MULTIPLIER;
  delete process.env.USD_TO_BRL;
});

describe("priceFor", () => {
  it("matches exact model ids", () => {
    expect(priceFor("gpt-4.1").inputPerMillionUsd).toBe(2);
    expect(priceFor("claude-opus-5").outputPerMillionUsd).toBe(25);
  });

  it("matches versioned ids returned by providers", () => {
    // Os provedores devolvem "gpt-4.1-2025-04-14", "gemini-flash-latest-001"…
    expect(priceFor("gpt-4.1-2025-04-14")).toEqual(priceFor("gpt-4.1"));
    expect(priceFor("gemini-flash-latest-001")).toEqual(priceFor("gemini-flash-latest"));
  });

  it("prefers the most specific known prefix", () => {
    // "gpt-4.1-mini" não pode cair no preço (bem mais caro) de "gpt-4.1".
    expect(priceFor("gpt-4.1-mini-2025-04-14").inputPerMillionUsd).toBe(0.4);
  });

  it("charges the conservative price for unknown models", () => {
    expect(priceFor("modelo-que-nao-existe")).toEqual(FALLBACK_PRICE);
  });
});

describe("providerCostUsd", () => {
  it("prices input and output separately", () => {
    // 1M entrada + 1M saída no gpt-4.1 = 2 + 8 dólares.
    expect(providerCostUsd("gpt-4.1", 1_000_000, 1_000_000)).toBeCloseTo(10);
  });

  it("ignores negative token counts", () => {
    expect(providerCostUsd("gpt-4.1", -100, -100)).toBe(0);
  });
});

describe("priceRun", () => {
  it("applies Atlas's margin and the exchange rate", () => {
    const { providerCostUsd: cost, chargedCents } = priceRun("gpt-4.1", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(10);
    const expected = Math.ceil(10 * DEFAULT_MARGIN_MULTIPLIER * DEFAULT_USD_TO_BRL * 100);
    expect(chargedCents).toBe(expected);
  });

  it("always charges at least one cent for real usage", () => {
    // Uma chamada minúscula não pode sair de graça e virar prejuízo em escala.
    const { chargedCents } = priceRun("gemini-flash-lite-latest", 10, 10);
    expect(chargedCents).toBeGreaterThanOrEqual(1);
  });

  it("charges nothing when nothing was consumed", () => {
    expect(priceRun("gpt-4.1", 0, 0).chargedCents).toBe(0);
  });

  it("honours a configured margin", () => {
    process.env.AI_MARGIN_MULTIPLIER = "5";
    expect(marginMultiplier()).toBe(5);
    const a = priceRun("gpt-4.1", 100_000, 100_000).chargedCents;
    process.env.AI_MARGIN_MULTIPLIER = "10";
    expect(priceRun("gpt-4.1", 100_000, 100_000).chargedCents).toBeGreaterThan(a);
  });

  it("ignores an invalid margin instead of zeroing revenue", () => {
    process.env.AI_MARGIN_MULTIPLIER = "abc";
    expect(marginMultiplier()).toBe(DEFAULT_MARGIN_MULTIPLIER);
    process.env.AI_MARGIN_MULTIPLIER = "0";
    expect(marginMultiplier()).toBe(DEFAULT_MARGIN_MULTIPLIER);
  });

  it("never charges less than the provider cost", () => {
    for (const model of ["gpt-4.1", "claude-opus-5", "gemini-flash-latest", "desconhecido"]) {
      const { providerCostUsd: cost, chargedCents } = priceRun(model, 500_000, 200_000);
      const chargedUsd = chargedCents / 100 / DEFAULT_USD_TO_BRL;
      expect(chargedUsd).toBeGreaterThan(cost);
    }
  });
});

describe("formatCents", () => {
  it("formats Brazilian currency", () => {
    expect(formatCents(1999).replace(/ /g, " ")).toBe("R$ 19,99");
  });
});
