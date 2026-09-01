import { describe, expect, it } from "vitest";
import { assertFitsInQuota, type DataQuota } from "@/services/data-quota";

const quota = (usedRows: number, maxRows: number): DataQuota => ({ usedRows, maxRows });

describe("teto de dados por conta", () => {
  /**
   * Por que existe: o Postgres do plano gratuito do Supabase tem 500 MB, e
   * eles são do banco INTEIRO, compartilhados por todas as contas. Medido com
   * a base COVID real, 306.429 linhas ocupam 30 MB — dezesseis bases dessas
   * enchem o banco de todo mundo. Sem teto por conta, o sintoma seria o
   * produto parando de aceitar upload para TODOS os clientes ao mesmo tempo.
   */
  it("accepts a file that fits in what is left", () => {
    expect(() => assertFitsInQuota(quota(10_000, 50_000), 40_000)).not.toThrow();
  });

  it("refuses a file that would overflow", () => {
    expect(() => assertFitsInQuota(quota(10_000, 50_000), 40_001)).toThrow(/só cabem mais/);
  });

  /**
   * A recusa acontece ANTES de gravar, então a mensagem pode prometer isso —
   * e precisa prometer, senão o usuário vai procurar a base pela metade.
   */
  it("promises that nothing was imported", () => {
    try {
      assertFitsInQuota(quota(45_000, 50_000), 100_000);
      throw new Error("deveria ter recusado");
    } catch (error) {
      const m = (error as Error).message;
      expect(m).toContain("Nada foi importado");
      // Diz os três números que a pessoa precisa para decidir.
      expect(m).toContain("100.000");  // o que ela tentou enviar
      expect(m).toContain("5.000");    // o que ainda cabe
      expect(m).toContain("50.000");   // o teto do plano
    }
  });

  // Saída à mão: apagar, recortar ou mudar de plano. Limite sem saída é muro.
  it("offers a way out instead of just saying no", () => {
    try {
      assertFitsInQuota(quota(50_000, 50_000), 1);
      throw new Error("deveria ter recusado");
    } catch (error) {
      const m = (error as Error).message;
      expect(m).toMatch(/Apague|recorte|plano/i);
    }
  });

  /** -1 é "sem teto", e é o que os planos maiores usam. */
  it("lets an unlimited plan through", () => {
    expect(() => assertFitsInQuota(quota(9_000_000, -1), 5_000_000)).not.toThrow();
  });

  /**
   * Teto desconhecido (migração pendente, banco fora do ar) NÃO bloqueia:
   * recusar dado do cliente por não saber o saldo é pior que aceitar um pouco
   * além do teto.
   */
  it("does not block when the quota could not be read", () => {
    expect(() => assertFitsInQuota({ usedRows: 0, maxRows: -1 }, 10_000_000)).not.toThrow();
  });

  // Conta cheia recusa até uma linha, sem cair em aritmética negativa.
  it("handles an account already over the limit", () => {
    expect(() => assertFitsInQuota(quota(60_000, 50_000), 1)).toThrow(/mais 0 /);
  });
});
