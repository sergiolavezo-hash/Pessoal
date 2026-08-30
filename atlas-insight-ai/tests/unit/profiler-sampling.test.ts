import { describe, expect, it } from "vitest";
import { classifyColumn } from "@/data-profiler/profiler";

function profile(over: Partial<{ unique_count: number; cardinality: number; max: unknown }> = {}) {
  return {
    row_count: 500,
    unique_count: over.unique_count ?? 11,
    cardinality: over.cardinality ?? 0.02,
    null_percentage: 0,
    sample_values: [] as unknown[],
    max: over.max,
  };
}

describe("número com poucos valores distintos: código ou métrica?", () => {
  /**
   * O caso real, achado rodando a base COVID contra um Postgres de verdade.
   * A amostra do perfil eram as PRIMEIRAS 500 linhas, e arquivo de negócio
   * chega em ordem cronológica — ou seja, o começo da pandemia, onde `deaths`
   * era quase tudo zero: 11 valores distintos. A regra de cardinalidade
   * classificava a coluna como CATEGORIA, e o painel perdia a coluna de
   * óbitos inteira.
   *
   * A correção da amostragem resolve a causa; esta regra é a segunda linha de
   * defesa, porque toda métrica nova começa com poucos valores distintos —
   * vendas de um produto recém-lançado, óbitos no primeiro mês de uma
   * epidemia.
   */
  it("keeps a large-valued numeric column as a measure", () => {
    const r = classifyColumn("deaths", "numeric", profile({ max: 112_385 }) as never, true);
    expect(r.classification).toBe("MEASURE");
  });

  // Código de verdade não chega a milhares: status 1/2/3, faixa 1..5.
  it("still treats a small-valued numeric code as a category", () => {
    const r = classifyColumn("status", "bigint", profile({ unique_count: 3, max: 3 }) as never, true);
    expect(r.classification).toBe("CATEGORY");
  });

  it("treats a high-cardinality numeric column as a measure regardless", () => {
    const r = classifyColumn("valor", "numeric", profile({ cardinality: 0.9, max: 10 }) as never, true);
    expect(r.classification).toBe("MEASURE");
  });

  // Sem max conhecido, o comportamento antigo continua: não inventa medida.
  // (o nome evita "codigo", que bate na regra de chave estrangeira antes.)
  it("falls back to the cardinality rule when the range is unknown", () => {
    const r = classifyColumn("nivel", "bigint", profile({ unique_count: 4, max: undefined }) as never, true);
    expect(r.classification).toBe("CATEGORY");
  });
});
