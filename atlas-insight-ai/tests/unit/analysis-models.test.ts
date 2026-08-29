import { describe, expect, it } from "vitest";
import { assertValidName } from "@/services/analysis-models";

/**
 * O nome é do usuário e é como ele reencontra o que criou. Normalizar espaços
 * evita que "Modelo  Comercial" e "Modelo Comercial" virem dois modelos
 * distintos numa lista, indistinguíveis a olho nu.
 */
describe("assertValidName", () => {
  it("collapses inner and outer whitespace", () => {
    expect(assertValidName("  Modelo   Comercial  ")).toBe("Modelo Comercial");
  });

  it("keeps a valid name untouched", () => {
    expect(assertValidName("Modelo Financeiro")).toBe("Modelo Financeiro");
  });

  it("rejects a name that says nothing", () => {
    expect(() => assertValidName("")).toThrow();
    expect(() => assertValidName("   ")).toThrow();
    expect(() => assertValidName("a")).toThrow();
  });

  it("rejects a name too long to fit a card", () => {
    expect(() => assertValidName("x".repeat(81))).toThrow();
    expect(assertValidName("x".repeat(80))).toHaveLength(80);
  });

  it("accepts accents and punctuation people actually use", () => {
    expect(assertValidName("Análise de Vendas — 2026")).toBe("Análise de Vendas — 2026");
  });
});
