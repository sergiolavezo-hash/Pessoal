import { describe, expect, it } from "vitest";
import { renderContextForPrompt, type WorkspaceAiContext } from "@/ai/context";

/**
 * A correção do usuário precisa CHEGAR ao prompt — é aí que ela vira valor.
 * O rótulo da tabela e o papel de cada coluna decidem se o painel soma
 * dinheiro ou conta registros; uma correção que fica só no banco não muda
 * nada e o usuário conclui que o produto ignora o que ele ensina.
 */
function contextWith(
  overrides: Partial<{
    label: string;
    columnName: string;
    displayName: string | null;
    description: string | null;
    role: string | null;
  }> = {}
): WorkspaceAiContext {
  return {
    dataSourceId: "ds",
    dialect: "postgres",
    semanticModel: null,
    semanticModelId: null,
    metrics: [],
    businessRules: [],
    glossary: [],
    rawSchema: [
      {
        table: "file_data.f_ab12",
        label: overrides.label ?? "query_resultado_rebp00003809",
        context: null,
        rowCount: 3,
        columns: [
          {
            name: overrides.columnName ?? "col_1",
            type: "numeric",
            role: overrides.role === undefined ? "CATEGORY" : overrides.role,
            displayName: overrides.displayName ?? null,
            description: overrides.description ?? null,
            distinctCount: 3,
            nullPercentage: 0,
            min: 1,
            max: 900,
            average: 300,
            sampleValues: ["100", "300", "900"],
          },
        ],
      },
    ],
    allowedTables: [],
    contextVersion: "v1",
  } as unknown as WorkspaceAiContext;
}

describe("correções do usuário no prompt", () => {
  it("uses the friendly table name the user gave", () => {
    const prompt = renderContextForPrompt(contextWith({ label: "Vendas 2026" }));
    expect(prompt).toContain('known to the user as "Vendas 2026"');
    // O identificador físico continua: é ele que o SQL precisa citar.
    expect(prompt).toContain("file_data.f_ab12");
  });

  it("carries the business name and meaning of a column", () => {
    const prompt = renderContextForPrompt(
      contextWith({
        columnName: "col_1",
        displayName: "Faturamento",
        description: "valor líquido, sem frete",
      })
    );
    expect(prompt).toContain('chamada de "Faturamento"');
    expect(prompt).toContain("significa: valor líquido, sem frete");
  });

  /**
   * O caso que motiva tudo: o perfilador chamou de categoria uma coluna que é
   * dinheiro. Sem a correção chegar ao prompt, o painel conta registros.
   */
  it("presents a corrected role as a measure to aggregate", () => {
    const prompt = renderContextForPrompt(
      contextWith({ columnName: "col_1", role: "MEASURE" })
    );
    expect(prompt).toContain("Measures to aggregate: col_1");
  });

  it("does not repeat the business name when it equals the physical one", () => {
    const prompt = renderContextForPrompt(
      contextWith({ columnName: "faturamento", displayName: "faturamento" })
    );
    expect(prompt).not.toContain('chamada de "faturamento"');
  });

  it("says nothing extra when the user corrected nothing", () => {
    const prompt = renderContextForPrompt(contextWith());
    expect(prompt).not.toContain("chamada de");
    expect(prompt).not.toContain("significa:");
  });
});
