import { describe, expect, it } from "vitest";
import { formatBRL, slugify } from "@/lib/utils";

describe("slugify", () => {
  it("normaliza acentos e espaços", () => {
    expect(slugify("Atlas Tecnologia")).toBe("atlas-tecnologia");
    expect(slugify("Ação & Reação Ltda.")).toBe("acao-reacao-ltda");
  });

  it("corta em 60 caracteres", () => {
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe("formatBRL", () => {
  it("formata centavos em reais", () => {
    // Intl usa NBSP entre "R$" e o valor — normalizamos para comparar.
    expect(formatBRL(49700).replace(/ /g, " ")).toBe("R$ 497,00");
    expect(formatBRL(0).replace(/ /g, " ")).toBe("R$ 0,00");
  });
});
