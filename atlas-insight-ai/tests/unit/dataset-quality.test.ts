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

describe("base boa que só não foi perfilada", () => {
  /**
   * O caso real que motivou esta separação. A base COVID entrou completa —
   * `confirmed`, `deaths` e `recovered` numéricas, `country_region`
   * categórica, `observationdate` de data. O perfilamento é que não terminou
   * (ele roda em `after()`, dividindo os mesmos 60s que a ingestão gastou), e
   * sem papel de coluna a nota somava QUATRO penalidades pela MESMA causa:
   * −25 sem medida, −20 sem categoria, −10 sem data, −15 sem perfil = 30/100.
   *
   * O usuário via "estes dados não sustentam um painel confiável" numa base
   * perfeita, seguido de "ajuste a base" — conselho que não tinha como
   * funcionar, porque não havia nada para ajustar.
   */
  const semPerfil = context([
    {
      rowCount: 306_429,
      columns: [
        column({ name: "confirmed", role: null }),
        column({ name: "deaths", role: null }),
        column({ name: "country_region", role: null }),
        column({ name: "observationdate", role: null }),
      ],
    },
  ]);

  it("reports ONE cause instead of four symptoms of it", () => {
    const { problems } = scoreDataset(semPerfil);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("ainda não terminou de entender");
  });

  // A frase importa: acusar o dado do cliente por uma falha nossa faz ele
  // mexer numa base que está certa.
  it("says the fault is ours, not the data's", () => {
    const { problems } = scoreDataset(semPerfil);
    expect(problems[0]).toContain("não um problema dos seus dados");
    expect(problems.join(" ")).not.toContain("Nenhuma coluna numérica");
    expect(problems.join(" ")).not.toContain("Nenhuma coluna de categoria");
    expect(problems.join(" ")).not.toContain("Nenhuma coluna de data");
  });

  /**
   * Continua abaixo do corte — gerar sem papel de coluna faz a IA adivinhar.
   * Mas a saída é outra: perfilar, não mexer na base. É o que a bandeira
   * `pendingProfile` diz a quem chama.
   */
  it("still blocks generation, but flags a different way out", () => {
    const quality = scoreDataset(semPerfil);
    expect(quality.pendingProfile).toBe(true);
    expect(quality.score).toBeLessThan(50);
  });

  it("does not raise the pending flag once the columns are profiled", () => {
    const comPerfil = context([
      {
        rowCount: 306_429,
        columns: [
          column({ name: "confirmed", role: "MEASURE" }),
          column({ name: "country_region", role: "CATEGORY" }),
          column({ name: "observationdate", role: "DATE" }),
        ],
      },
    ]);
    const quality = scoreDataset(comPerfil);
    expect(quality.pendingProfile).toBeFalsy();
    expect(quality.score).toBe(100);
  });

  // Base genuinamente ruim tem de continuar sendo chamada de ruim.
  it("still calls out data that really is unusable", () => {
    const ruim = context([
      {
        rowCount: 5000,
        columns: [column({ name: "obs", role: "CATEGORY" }), column({ name: "nota", role: "CATEGORY" })],
      },
    ]);
    const quality = scoreDataset(ruim);
    expect(quality.pendingProfile).toBeFalsy();
    expect(quality.problems.join(" ")).toContain("Nenhuma coluna numérica");
  });
});
