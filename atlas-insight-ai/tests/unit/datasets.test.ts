import { describe, expect, it } from "vitest";
import {
  diffSchemas,
  hasSchemaChanges,
  impactedByRemovedColumns,
  DATASET_STATUS_LABEL,
} from "@/services/datasets";

describe("diffSchemas", () => {
  const before = [
    { name: "data", type: "date" },
    { name: "valor", type: "numeric" },
    { name: "cliente", type: "text" },
  ];

  it("sees no change when the schema is identical", () => {
    const diff = diffSchemas(before, before);
    expect(hasSchemaChanges(diff)).toBe(false);
  });

  it("detects added, removed and retyped columns", () => {
    const diff = diffSchemas(before, [
      { name: "data", type: "date" },
      { name: "valor", type: "text" },
      { name: "regiao", type: "text" },
    ]);
    expect(diff.added).toEqual(["regiao"]);
    expect(diff.removed).toEqual(["cliente"]);
    expect(diff.retyped).toEqual(["valor"]);
    expect(hasSchemaChanges(diff)).toBe(true);
  });

  it("handles an empty new schema as everything removed", () => {
    const diff = diffSchemas(before, []);
    expect(diff.removed).toHaveLength(3);
    expect(diff.added).toHaveLength(0);
  });
});

/**
 * Sem análise de impacto o painel apenas para de funcionar, e o usuário
 * descobre pelo gráfico vazio. Com ela, é avisado com o nome do painel e da
 * coluna que sumiu.
 */
describe("impactedByRemovedColumns", () => {
  const dashboards = [
    { id: "d1", name: "Receita Mensal", sql: ["select sum(receita) from vendas"] },
    { id: "d2", name: "Clientes", sql: ["select count(*) from clientes"] },
  ];

  it("finds the dashboard that uses a removed column", () => {
    const impacted = impactedByRemovedColumns(dashboards, ["receita"]);
    expect(impacted).toEqual([{ id: "d1", name: "Receita Mensal", columns: ["receita"] }]);
  });

  it("returns nothing when no column was removed", () => {
    expect(impactedByRemovedColumns(dashboards, [])).toEqual([]);
  });

  // "valor" não pode casar dentro de "valor_bruto": um falso alarme faz o
  // usuário ignorar os avisos verdadeiros.
  it("does not match a column name inside a longer identifier", () => {
    const dash = [{ id: "d3", name: "Bruto", sql: ["select sum(valor_bruto) from v"] }];
    expect(impactedByRemovedColumns(dash, ["valor"])).toEqual([]);
  });

  it("is case-insensitive", () => {
    const dash = [{ id: "d4", name: "Maiusculas", sql: ["SELECT SUM(RECEITA) FROM V"] }];
    expect(impactedByRemovedColumns(dash, ["receita"])[0]?.id).toBe("d4");
  });

  it("does not break on regex characters in a column name", () => {
    const dash = [{ id: "d5", name: "Estranho", sql: ["select a from t"] }];
    expect(() => impactedByRemovedColumns(dash, ["a.b(c)"])).not.toThrow();
  });
});

describe("rótulos de status", () => {
  // O usuário nunca deve ler DRAFT ou QUALITY_BLOCKED na tela.
  it("has a human label for every status", () => {
    for (const label of Object.values(DATASET_STATUS_LABEL)) {
      expect(label).not.toMatch(/^[A-Z_]+$/);
      expect(label.length).toBeGreaterThan(3);
    }
  });
});
