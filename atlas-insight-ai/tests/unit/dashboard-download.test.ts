import { describe, expect, it } from "vitest";
import { safeFileName, toCsv } from "@/dashboards/download";

describe("toCsv", () => {
  /**
   * Excel em português quebra colunas por ponto e vírgula. Separado por
   * vírgula, o arquivo abre como uma coluna só e o usuário conclui que a
   * exportação veio quebrada — e tecnicamente veio.
   */
  it("separates columns with a semicolon", () => {
    const csv = toCsv(["regiao", "valor"], [{ regiao: "Sul", valor: 100 }]);
    expect(csv.split("\r\n")[0]).toBe("regiao;valor");
    expect(csv.split("\r\n")[1]).toBe("Sul;100");
  });

  /**
   * O estrago de um valor mal escapado só aparece muitas colunas à frente,
   * onde ninguém liga a causa ao efeito.
   */
  it("quotes values containing the separator, quotes or line breaks", () => {
    const csv = toCsv(
      ["produto", "obs"],
      [{ produto: "Café; forte", obs: 'ele disse "ok"' }]
    );
    expect(csv).toContain('"Café; forte"');
    expect(csv).toContain('"ele disse ""ok"""');

    const multiline = toCsv(["nota"], [{ nota: "linha1\nlinha2" }]);
    expect(multiline).toContain('"linha1\nlinha2"');
  });

  // Célula vazia é diferente de zero: escrever "null" viraria dado falso.
  it("writes an empty cell for null and undefined", () => {
    const csv = toCsv(["a", "b"], [{ a: null, b: undefined }]);
    expect(csv.split("\r\n")[1]).toBe(";");
  });

  it("keeps zero and false, which are real values", () => {
    const csv = toCsv(["n", "flag"], [{ n: 0, flag: false }]);
    expect(csv.split("\r\n")[1]).toBe("0;false");
  });

  it("emits only the header when there are no rows", () => {
    expect(toCsv(["a", "b"], [])).toBe("a;b");
  });

  // Coluna ausente na linha não pode deslocar as seguintes.
  it("holds column alignment when a row lacks a field", () => {
    const csv = toCsv(["a", "b", "c"], [{ a: 1, c: 3 }]);
    expect(csv.split("\r\n")[1]).toBe("1;;3");
  });
});

describe("safeFileName", () => {
  /** Barra é proibida em nome de arquivo: o download falharia em silêncio. */
  it("strips characters the operating system rejects", () => {
    expect(safeFileName("Vendas 2026/2027", "csv")).toBe("Vendas 2026 2027.csv");
    expect(safeFileName("Receita: mensal", "csv")).toBe("Receita mensal.csv");
  });

  it("removes accents so the name travels between systems", () => {
    expect(safeFileName("Análise de Comissões", "csv")).toBe("Analise de Comissoes.csv");
  });

  it("falls back to a name instead of producing a bare extension", () => {
    expect(safeFileName("///", "csv")).toBe("painel.csv");
    expect(safeFileName("", "csv")).toBe("painel.csv");
  });

  it("caps the length", () => {
    expect(safeFileName("x".repeat(200), "csv").length).toBeLessThanOrEqual(64);
  });
});
