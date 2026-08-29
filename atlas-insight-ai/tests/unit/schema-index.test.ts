import { describe, expect, it } from "vitest";
import {
  narrowSchemaToBudget,
  renderSchemaIndex,
  selectRelevantTables,
} from "@/ai/schema-index";
import { renderContextForPrompt, type RawSchemaTable, type WorkspaceAiContext } from "@/ai/context";

function column(name: string, role: string | null) {
  return {
    name,
    type: "numeric",
    role,
    distinctCount: 1234,
    nullPercentage: 0.05,
    min: 0,
    max: 9999,
    average: 42,
    sampleValues: ["um", "dois", "tres"],
  };
}

function table(name: string, columns: string[], roles?: Record<string, string>): RawSchemaTable {
  return {
    table: `schema.${name}`,
    label: name,
    context: null,
    rowCount: 10_000,
    columns: columns.map((c) => column(c, roles?.[c] ?? "CATEGORY")),
  } as unknown as RawSchemaTable;
}

const schema = [
  table("vendas", ["data_venda", "valor", "cliente_id", "regiao"], {
    valor: "MEASURE",
    data_venda: "DATE",
  }),
  table("clientes", ["cliente_id", "nome", "segmento", "cidade"]),
  table("produtos", ["produto_id", "descricao", "categoria", "preco"], { preco: "MEASURE" }),
  table("estoque", ["produto_id", "quantidade", "deposito"], { quantidade: "MEASURE" }),
];

function context(tables: RawSchemaTable[]): WorkspaceAiContext {
  return {
    dataSourceId: "ds",
    dialect: "postgres",
    semanticModel: null,
    semanticModelId: null,
    metrics: [],
    businessRules: [],
    glossary: [],
    rawSchema: tables,
    allowedTables: [],
    contextVersion: "v1",
  } as unknown as WorkspaceAiContext;
}

describe("renderSchemaIndex", () => {
  it("names every table in one compact line each", () => {
    const index = renderSchemaIndex(schema);
    for (const t of schema) expect(index).toContain(t.table);
    expect(index.split("\n")).toHaveLength(schema.length + 1); // + cabeçalho
  });

  /**
   * O índice existe para o modelo SABER que as outras tabelas existem. Sem
   * ele, ao receber só o detalhe de vendas, o modelo inventa colunas de
   * clientes em vez de dizer que precisa daquela tabela.
   */
  it("is far smaller than the full detail", () => {
    const index = renderSchemaIndex(schema).length;
    const full = renderContextForPrompt(context(schema)).length;
    expect(index).toBeLessThan(full / 3);
  });
});

describe("selectRelevantTables", () => {
  it("picks the table the question names", () => {
    const picked = selectRelevantTables("faturamento de vendas por regiao", schema, 2);
    expect(picked?.map((t) => t.label)).toContain("vendas");
  });

  // Um corte fixo no primeiro colocado descartaria a segunda tabela de um
  // join legítimo, e o modelo receberia metade do que precisa.
  it("keeps a second table when the question spans both", () => {
    const picked = selectRelevantTables("vendas por segmento de clientes", schema, 3);
    const labels = picked?.map((t) => t.label) ?? [];
    expect(labels).toContain("vendas");
    expect(labels).toContain("clientes");
  });

  // Devolver null é o sinal de "não sei escolher" — melhor manter o
  // comportamento antigo do que cortar justamente a tabela certa.
  it("gives up when nothing in the question matches", () => {
    expect(selectRelevantTables("previsao do tempo amanha", schema, 2)).toBeNull();
    expect(selectRelevantTables("", schema, 2)).toBeNull();
  });
});

describe("narrowSchemaToBudget", () => {
  it("changes nothing while the whole schema fits", () => {
    const ctx = context(schema);
    const full = renderContextForPrompt(ctx);
    const result = narrowSchemaToBudget(ctx, "vendas", full.length, full.length + 1000);
    expect(result.narrowed).toBe(false);
    expect(result.tables).toHaveLength(schema.length);
    expect(result.index).toBeNull();
  });

  it("narrows to the relevant tables and keeps the index when over budget", () => {
    const ctx = context(schema);
    const full = renderContextForPrompt(ctx);
    const result = narrowSchemaToBudget(ctx, "faturamento de vendas", full.length, 200);
    expect(result.narrowed).toBe(true);
    expect(result.tables.length).toBeLessThan(schema.length);
    expect(result.index).toContain("estoque"); // a tabela cortada segue no índice
  });

  it("never returns an empty schema", () => {
    const ctx = context(schema);
    const result = narrowSchemaToBudget(ctx, "qualquer coisa", 999_999, 10);
    expect(result.tables.length).toBeGreaterThanOrEqual(1);
  });

  it("leaves a single-table workspace alone", () => {
    const ctx = context([schema[0]]);
    const result = narrowSchemaToBudget(ctx, "vendas", 999_999, 10);
    expect(result.narrowed).toBe(false);
  });

  /** A medida que justifica o recurso: quanto o prompt encolhe de fato. */
  it("cuts the prompt substantially on a wide schema", () => {
    const wide = Array.from({ length: 12 }, (_, i) =>
      table(
        `tabela_${i}`,
        Array.from({ length: 40 }, (_, c) => `coluna_descritiva_${c}`)
      )
    );
    wide[0] = table(
      "vendas",
      Array.from({ length: 40 }, (_, c) => `coluna_venda_${c}`)
    );

    const ctx = context(wide);
    const full = renderContextForPrompt(ctx);
    const result = narrowSchemaToBudget(ctx, "vendas por coluna_venda_1", full.length, 20_000);
    const narrowed =
      (result.index?.length ?? 0) +
      renderContextForPrompt({ ...ctx, rawSchema: result.tables }).length;

    expect(result.narrowed).toBe(true);
    expect(narrowed).toBeLessThan(full.length / 2);
  });
});
