import { describe, expect, it } from "vitest";
import { applyRestructurePlan, type RestructurePlan } from "@/ai/file-restructure";

// Grade no estilo do modelo de orçamento pessoal: título, instruções na
// lateral, célula mesclada (categoria só na primeira linha do grupo),
// subtotais no meio e meses em colunas.
const matrix: unknown[][] = [
  ["Orçamento Pessoal 2025", null, null, null, null],
  [null, "Categoria", "Despesa", "Janeiro", "Fevereiro"],
  ["Aquelas que têm", "Habitação", "Condomínio", "592,77", "592,77"],
  ["o mesmo montante", null, "Prestação da casa", "R$ 2.792,90", null],
  [null, null, "Total despesas fixas", "3385.67", "592.77"],
  [null, "Transporte", "Seguro Moto", "396", "396"],
  [null, "% sobre Receita", null, "0.04", "0.01"],
];

const plan: RestructurePlan = {
  needsRestructure: true,
  dataStartRow: 2,
  columns: [
    { index: 0, name: "observacao", role: "ignore", fillDown: false },
    { index: 1, name: "categoria", role: "dimension", fillDown: true },
    { index: 2, name: "despesa", role: "dimension", fillDown: false },
    { index: 3, name: "janeiro", role: "value", fillDown: false },
    { index: 4, name: "fevereiro", role: "value", fillDown: false },
  ],
  skipRows: [],
  skipRowContains: ["total ", "% sobre"],
  unpivot: { columnIndexes: [3, 4], variableName: "mes", valueName: "valor" },
  summary: "Meses viraram linhas; subtotais removidos.",
};

describe("applyRestructurePlan", () => {
  it("unpivots months, fills down merged cells and drops subtotal rows", () => {
    const parsed = applyRestructurePlan(matrix, plan, []);
    expect(parsed.columns.map((c) => c.name)).toEqual(["categoria", "despesa", "mes", "valor"]);
    // 3 linhas de dados × meses preenchidos: Condomínio (2) + Prestação (1) + Seguro Moto (2)
    expect(parsed.rows).toHaveLength(5);
    const prestacao = parsed.rows.find((r) => r.despesa === "Prestação da casa");
    expect(prestacao).toMatchObject({ categoria: "Habitação", mes: "janeiro", valor: 2792.9 });
    const seguro = parsed.rows.filter((r) => r.despesa === "Seguro Moto");
    expect(seguro.map((r) => r.categoria)).toEqual(["Transporte", "Transporte"]);
    expect(parsed.rows.some((r) => String(r.despesa ?? "").includes("Total"))).toBe(false);
    expect(parsed.warnings.some((w) => w.includes("IA reestruturou"))).toBe(true);
  });

  it("keeps a flat table when unpivot is null", () => {
    const flat = applyRestructurePlan(matrix, { ...plan, unpivot: null }, []);
    expect(flat.columns.map((c) => c.name)).toEqual(["categoria", "despesa", "janeiro", "fevereiro"]);
    expect(flat.rows).toHaveLength(3);
  });

  it("throws when the plan produces no rows", () => {
    expect(() =>
      applyRestructurePlan(matrix, { ...plan, dataStartRow: 7 }, [])
    ).toThrow(/no data rows/);
  });
});

// Defesas que não dependem do plano da IA estar perfeito. Sem elas, um bloco
// de resumo no rodapé faz cada indicador somar os mesmos valores duas vezes.
describe("applyRestructurePlan guards", () => {
  // Grade com um SEGUNDO cabeçalho no meio, seguido de um bloco-resumo.
  const withSummary: unknown[][] = [
    [null, "Categoria", "Despesa", "Janeiro", "Fevereiro"],
    [null, "Habitação", "Condomínio", "100", "100"],
    [null, "Transporte", "Combustível", "50", "70"],
    [null, null, "Medidas", "Janeiro", "Fevereiro"],
    [null, null, "Total despesas", "150", "170"],
  ];
  const base: RestructurePlan = {
    needsRestructure: true,
    dataStartRow: 1,
    columns: [
      { index: 1, name: "categoria", role: "dimension", fillDown: true },
      { index: 2, name: "despesa", role: "dimension", fillDown: false },
      { index: 3, name: "janeiro", role: "value", fillDown: false },
      { index: 4, name: "fevereiro", role: "value", fillDown: false },
    ],
    skipRows: [],
    skipRowContains: [],
    unpivot: { columnIndexes: [3, 4], variableName: "mes", valueName: "valor" },
    summary: "",
  };

  it("stops at a repeated header so summary blocks never double count", () => {
    const parsed = applyRestructurePlan(withSummary, base, []);
    // Apenas as 2 linhas reais × 2 meses; o bloco-resumo ficou de fora.
    expect(parsed.rows).toHaveLength(4);
    const total = parsed.rows.reduce((a, r) => a + Number(r.valor), 0);
    expect(total).toBe(320);
    expect(parsed.warnings.some((w) => w.includes("novo cabeçalho"))).toBe(true);
  });

  it("drops stray text left in a mostly numeric measure column", () => {
    const grid: unknown[][] = [
      [null, "Categoria", "Despesa", "Janeiro"],
      [null, "Habitação", "Condomínio", "100"],
      [null, "Transporte", "Combustível", "50"],
      [null, "Saúde", "Plano", "300"],
      [null, "Educação", "Curso", "R$ 1.200,00"],
      [null, "Lazer", "Cinema", "n/a"],
    ];
    const parsed = applyRestructurePlan(
      grid,
      { ...base, columns: base.columns.slice(0, 3), unpivot: null },
      []
    );
    const cinema = parsed.rows.find((r) => r.despesa === "Cinema");
    expect(cinema?.janeiro).toBeNull();
    expect(parsed.columns.find((c) => c.name === "janeiro")?.type).toBe("double precision");
    expect(parsed.warnings.some((w) => w.includes("texto em colunas numéricas"))).toBe(true);
  });
});
