import { describe, expect, it } from "vitest";
import {
  MAX_FILE_ROWS,
  buildParsedFromMatrix,
  firstFreeTableName,
  logicalTableName,
} from "@/services/file-ingest";
import { looksUnstructured } from "@/ai/file-restructure";
import { maxOf, minOf } from "@/lib/extremes";

function grid(rows: number, cols = 3): unknown[][] {
  const matrix: unknown[][] = [Array.from({ length: cols }, (_, c) => `col${c}`)];
  for (let i = 0; i < rows; i++) {
    matrix.push(Array.from({ length: cols }, (_, c) => (c === 0 ? i : `v${i}_${c}`)));
  }
  return matrix;
}

describe("maxOf / minOf", () => {
  /**
   * O motivo desta função existir. Math.max(...valores) transforma cada item
   * num argumento, e acima de ~125 mil o V8 derruba a pilha — bem dentro da
   * faixa de tamanho que o produto existe para analisar.
   */
  it("survives more arguments than the V8 stack accepts", () => {
    const many = Array.from({ length: 300_000 }, (_, i) => i);
    expect(() => Math.max(...many)).toThrow(RangeError);
    expect(maxOf(many)).toBe(299_999);
    expect(minOf(many)).toBe(0);
  });

  // -Infinity como "maior de nada" vira número em relatório.
  it("returns undefined for an empty list instead of Infinity", () => {
    expect(maxOf([])).toBeUndefined();
    expect(minOf([])).toBeUndefined();
  });

  it("handles negatives and a single value", () => {
    expect(maxOf([-5, -1, -9])).toBe(-1);
    expect(minOf([-5, -1, -9])).toBe(-9);
    expect(maxOf([42])).toBe(42);
  });
});

describe("buildParsedFromMatrix com arquivo grande", () => {
  /**
   * O caso real que motivou tudo: um CSV de 306.431 linhas quebrava a LEITURA
   * com "Maximum call stack size exceeded" antes de qualquer outra coisa. A
   * ingestão em fatias não adiantava nada — o arquivo nunca chegava lá.
   */
  it("reads 306,431 rows without blowing the stack", () => {
    const parsed = buildParsedFromMatrix(grid(306_431), []);
    expect(parsed.rows).toHaveLength(306_431);
    expect(parsed.columns).toHaveLength(3);
  });

  /**
   * A leitura CORTAVA em 500 mil linhas e só empurrava um aviso, então o teto
   * que recusaria o arquivo nunca disparava: a base entrava truncada, marcada
   * como pronta. Perder dado do cliente em silêncio é pior que recusar.
   */
  it("refuses instead of silently truncating above the limit", () => {
    expect(() => buildParsedFromMatrix(grid(MAX_FILE_ROWS + 1), [])).toThrow(/limite por upload/);
    expect(() => buildParsedFromMatrix(grid(MAX_FILE_ROWS + 1), [])).toThrow(/Nada foi importado/);
  });

  it("says how many rows the file had and what the limit is", () => {
    try {
      buildParsedFromMatrix(grid(MAX_FILE_ROWS + 7), []);
      throw new Error("deveria ter recusado");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain((MAX_FILE_ROWS + 7).toLocaleString("pt-BR"));
      expect(message).toContain(MAX_FILE_ROWS.toLocaleString("pt-BR"));
    }
  });
});

describe("looksUnstructured", () => {
  /**
   * Separador sobrando no fim da linha é o export mais comum que existe. Ele
   * gera uma coluna vazia — e enquanto isso contava como "layout bagunçado",
   * um CSV limpo de 300 mil linhas virava candidato a remontagem por IA:
   * gastava token à toa e caía no caminho que ingere tudo num pedido só.
   */
  it("does not treat a removed empty column as a messy layout", () => {
    const parsed = buildParsedFromMatrix(
      [
        ["regiao", "valor", ""],
        ["Sul", "10", ""],
        ["Norte", "20", ""],
      ],
      []
    );
    expect(parsed.warnings.some((w) => w.includes("empty column"))).toBe(true);
    expect(looksUnstructured(parsed)).toBe(false);
  });

  // O que continua sendo sinal de verdade: coluna sem nome nenhum.
  it("still flags columns with no name at all", () => {
    const parsed = buildParsedFromMatrix(
      [
        ["", "", ""],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ],
      []
    );
    expect(looksUnstructured(parsed)).toBe(true);
  });
});

describe("logicalTableName", () => {
  /**
   * A tabela física vem daqui. A trava de concorrência comparava o nome do
   * ARQUIVO, então dois nomes que caem no mesmo destino passavam pela trava —
   * e o segundo derrubava a tabela que o primeiro ainda estava preenchendo.
   */
  it("collapses names that fight for the same table", () => {
    const target = logicalTableName("Vendas 2024.csv");
    for (const name of ["vendas-2024.xlsx", "vendas 2024.CSV", "Vendas  2024.xls"]) {
      expect(logicalTableName(name)).toBe(target);
    }
  });

  it("keeps genuinely different files apart", () => {
    expect(logicalTableName("vendas.csv")).not.toBe(logicalTableName("compras.csv"));
  });

  it("is stable across calls, which is what the resume depends on", () => {
    expect(logicalTableName("Relatório Anual.csv")).toBe(logicalTableName("Relatório Anual.csv"));
  });
});

describe("firstFreeTableName", () => {
  /**
   * Sem desempatar, "relatorio-vendas.xlsx" derrubava a tabela de
   * "Relatorio Vendas.csv" — drop + recreate com o conteúdo de outro arquivo.
   * O registro do primeiro continuava PRONTO, e todo painel montado sobre ele
   * passava a ler dados que não são os dele.
   */
  it("uses the base name when nobody owns it", () => {
    expect(firstFreeTableName("vendas", [])).toBe("vendas");
    expect(firstFreeTableName("vendas", ["compras", "clientes"])).toBe("vendas");
  });

  it("steps aside instead of taking a name another file owns", () => {
    expect(firstFreeTableName("vendas", ["vendas"])).toBe("vendas_2");
    expect(firstFreeTableName("vendas", ["vendas", "vendas_2"])).toBe("vendas_3");
  });

  // Buracos são reaproveitados: apagar um arquivo não deve empurrar o próximo
  // para um número cada vez maior.
  it("fills a gap left by a deleted file", () => {
    expect(firstFreeTableName("vendas", ["vendas", "vendas_3"])).toBe("vendas_2");
  });

  it("is deterministic, which is what re-uploading depends on", () => {
    const taken = ["vendas", "vendas_2"];
    expect(firstFreeTableName("vendas", taken)).toBe(firstFreeTableName("vendas", taken));
  });
});
