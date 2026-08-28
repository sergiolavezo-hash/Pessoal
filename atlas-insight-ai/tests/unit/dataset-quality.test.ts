import { describe, expect, it } from "vitest";
import { scoreDataset } from "@/ai/dataset-quality";
import type { WorkspaceAiContext } from "@/ai/context";

/**
 * O portão de qualidade existe para uma razão econômica: a camada gratuita
 * dos provedores tem teto diário para a plataforma inteira, e uma geração
 * gasta milhares de tokens. Mandar uma base vazia para o modelo consome essa
 * cota e devolve gráficos em branco — o pior dos dois mundos.
 */

function column(over: Partial<{
  name: string;
  role: string | null;
  nullPercentage: number | null;
}> = {}) {
  return {
    name: over.name ?? "col",
    type: "text",
    role: over.role === undefined ? "CATEGORY" : over.role,
    distinctCount: 10,
    nullPercentage: over.nullPercentage ?? 0,
    min: null,
    max: null,
    average: null,
    sampleValues: [] as string[],
  };
}

function context(
  tables: Array<{ rowCount: number | null; columns: ReturnType<typeof column>[] }>
): WorkspaceAiContext {
  return {
    dataSourceId: "ds1",
    dialect: "postgres",
    semanticModel: null,
    semanticModelId: null,
    metrics: [],
    businessRules: [],
    glossary: [],
    rawSchema: tables.map((t, i) => ({
      table: `t${i}`,
      label: `Tabela ${i}`,
      context: null,
      rowCount: t.rowCount,
      columns: t.columns,
    })),
    allowedTables: ["t0"],
    contextVersion: "v1",
  } as unknown as WorkspaceAiContext;
}

describe("scoreDataset", () => {
  it("gives a healthy dataset a passing score", () => {
    const { score } = scoreDataset(
      context([
        {
          rowCount: 5000,
          columns: [
            column({ name: "valor", role: "MEASURE" }),
            column({ name: "categoria", role: "CATEGORY" }),
            column({ name: "data", role: "DATE" }),
          ],
        },
      ])
    );
    expect(score).toBe(100);
  });

  it("blocks a source with no synced tables", () => {
    const { score, problems } = scoreDataset(context([]));
    expect(score).toBe(0);
    expect(problems[0]).toContain("Nenhuma tabela");
  });

  // Uma base sem linhas gera um painel inteiro de gráficos vazios, e cobra
  // a geração completa por isso.
  it("blocks an empty table outright", () => {
    const { score, problems } = scoreDataset(
      context([{ rowCount: 0, columns: [column({ role: "MEASURE" })] }])
    );
    expect(score).toBe(0);
    expect(problems.join(" ")).toContain("vazia");
  });

  it("penalises a dataset with nothing to aggregate or group by", () => {
    const { score, problems } = scoreDataset(
      context([
        {
          rowCount: 5000,
          columns: [column({ name: "id", role: "ID" }), column({ name: "fk", role: "FOREIGN_KEY" })],
        },
      ])
    );
    // Sem medida (-25), sem quebra (-20) e sem data (-10).
    expect(score).toBe(45);
    expect(problems.join(" ")).toContain("numérica");
    expect(problems.join(" ")).toContain("categoria");
  });

  it("penalises mostly-empty columns", () => {
    const withEmpties = scoreDataset(
      context([
        {
          rowCount: 5000,
          columns: [
            column({ name: "valor", role: "MEASURE" }),
            column({ name: "categoria", role: "CATEGORY" }),
            column({ name: "data", role: "DATE" }),
            column({ name: "vazia1", nullPercentage: 0.99 }),
            column({ name: "vazia2", nullPercentage: 0.95 }),
          ],
        },
      ])
    );
    expect(withEmpties.score).toBeLessThan(100);
    expect(withEmpties.problems.join(" ")).toContain("vazias");
  });

  it("never returns a score outside 0..100", () => {
    const worst = scoreDataset(
      context([
        {
          rowCount: 1,
          columns: [
            column({ name: "a", role: null, nullPercentage: 1 }),
            column({ name: "b", role: null, nullPercentage: 1 }),
          ],
        },
      ])
    );
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
  });
});
