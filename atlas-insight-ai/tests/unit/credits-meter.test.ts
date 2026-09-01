import { describe, expect, it } from "vitest";
import { CENTS_PER_CREDIT, toCredits } from "@/services/ai-credits";

/**
 * A regra de negócio que a barra de créditos representa. O componente é
 * visual, mas a aritmética que ele mostra decide se o usuário confia no
 * número — e um número de saldo errado é o pior tipo de erro num produto
 * que cobra.
 */
function barPercent(remaining: number, allowance: number): number {
  return allowance > 0 ? Math.max(0, Math.min(100, (remaining / allowance) * 100)) : 0;
}

function tone(pct: number): "ok" | "atencao" | "critico" {
  return pct > 40 ? "ok" : pct > 15 ? "atencao" : "critico";
}

describe("créditos: unidade", () => {
  /**
   * 1 crédito = 1 centavo de custo real de IA. Manter a unidade colada ao
   * custo é o que deixa o extrato conciliável: 500 créditos são R$ 5,00 de
   * IA de verdade, não uma moeda inventada.
   */
  it("keeps one credit worth one centavo", () => {
    expect(CENTS_PER_CREDIT).toBe(1);
    expect(toCredits(500)).toBe(500);
    expect(toCredits(5000)).toBe(5000);
  });

  it("rounds instead of showing a fractional credit", () => {
    expect(Number.isInteger(toCredits(333))).toBe(true);
    expect(toCredits(0)).toBe(0);
  });
});

describe("barra de créditos", () => {
  it("fills proportionally to what is left", () => {
    expect(barPercent(500, 500)).toBe(100);
    expect(barPercent(250, 500)).toBe(50);
    expect(barPercent(0, 500)).toBe(0);
  });

  /**
   * Franquia zero não tem escala. Dividir por zero daria NaN e a barra
   * sumiria da tela sem dizer nada; barra vazia é a leitura honesta.
   */
  it("shows an empty bar instead of NaN when there is no allowance", () => {
    expect(barPercent(0, 0)).toBe(0);
    expect(Number.isNaN(barPercent(10, 0))).toBe(false);
  });

  // Saldo comprado pode passar da franquia do dia; a barra não estoura.
  it("never overflows past full", () => {
    expect(barPercent(900, 500)).toBe(100);
  });

  // A cor é informação, não enfeite: quem está no fim precisa ver sem ler.
  it("turns critical before the credits actually run out", () => {
    expect(tone(barPercent(500, 500))).toBe("ok");
    expect(tone(barPercent(150, 500))).toBe("atencao");
    expect(tone(barPercent(40, 500))).toBe("critico");
    expect(tone(barPercent(0, 500))).toBe("critico");
  });
});
