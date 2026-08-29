import { describe, expect, it } from "vitest";
import { applyFilters, canApply, quoteLiteral } from "@/dashboards/filters";

const SQL = "select regiao, sum(valor) as total from vendas group by regiao";
const COLUMNS = ["regiao", "total", "data_venda"];

describe("quoteLiteral", () => {
  it("doubles single quotes, the SQL standard escape", () => {
    expect(quoteLiteral("O'Brien")).toBe("'O''Brien'");
  });

  /**
   * O caso que decide se o recurso é seguro. O valor vem da tela, e um
   * apóstrofo mal escapado fecharia a string e deixaria o resto virar
   * comando — com a consulta rodando na fonte do próprio cliente.
   */
  it("neutralises an injection attempt", () => {
    const evil = "x'; drop table vendas; --";
    const quoted = quoteLiteral(evil);
    expect(quoted).toBe("'x''; drop table vendas; --'");
    // Aspas simples sempre em número par: nenhuma string fica aberta.
    expect((quoted.match(/'/g) ?? []).length % 2).toBe(0);
  });

  it("keeps accents and spaces untouched", () => {
    expect(quoteLiteral("São Paulo")).toBe("'São Paulo'");
  });
});

describe("canApply", () => {
  it("accepts a real output column", () => {
    expect(canApply({ field: "regiao" }, COLUMNS)).toBe(true);
  });

  /**
   * Um filtro que aparece na tela e não muda o número é pior que filtro
   * nenhum: o usuário mexe, nada acontece, e passa a duvidar da tela.
   */
  it("refuses a column the widget does not return", () => {
    expect(canApply({ field: "vendedor" }, COLUMNS)).toBe(false);
  });

  // Nome de coluna não é escapado — é conferido. O que não passa, não entra.
  it("refuses names that are not plain identifiers", () => {
    for (const field of ['regiao"', "regiao;drop", "1regiao", "re giao", ""]) {
      expect(canApply({ field }, [...COLUMNS, field])).toBe(false);
    }
  });
});

describe("applyFilters", () => {
  it("returns the query untouched when nothing applies", () => {
    expect(applyFilters(SQL, [], COLUMNS).sql).toBe(SQL);
  });

  it("wraps instead of rewriting the widget query", () => {
    const { sql, applied } = applyFilters(
      SQL,
      [{ field: "regiao", type: "select", values: ["Sul"] }],
      COLUMNS
    );
    // A consulta original tem de sobreviver inteira: reescrevê-la mudaria o
    // número sem ninguém perceber.
    expect(sql).toContain(SQL);
    expect(sql).toContain(`where "regiao" in ('Sul')`);
    expect(applied).toEqual(["regiao"]);
  });

  it("combines several values and several filters", () => {
    const { sql } = applyFilters(
      SQL,
      [
        { field: "regiao", type: "multi_select", values: ["Sul", "Norte"] },
        { field: "data_venda", type: "date_range", from: "2026-01-01", to: "2026-03-31" },
      ],
      COLUMNS
    );
    expect(sql).toContain(`"regiao" in ('Sul', 'Norte')`);
    expect(sql).toContain(`"data_venda" >= '2026-01-01'`);
    expect(sql).toContain(`"data_venda" <= '2026-03-31'`);
    expect(sql).toContain(" and ");
  });

  // Data inventada viraria comparação com lixo; melhor não filtrar por ela.
  it("drops a date that is not a real ISO date", () => {
    const { sql } = applyFilters(
      SQL,
      [{ field: "data_venda", type: "date_range", from: "ontem", to: "'; drop --" }],
      COLUMNS
    );
    expect(sql).toBe(SQL);
  });

  it("reports the filters it could not apply", () => {
    const { sql, applied, ignored } = applyFilters(
      SQL,
      [{ field: "vendedor", type: "select", values: ["Ana"] }],
      COLUMNS
    );
    expect(sql).toBe(SQL);
    expect(applied).toEqual([]);
    expect(ignored).toEqual(["vendedor"]);
  });

  // Um filtro sem valor escolhido não é erro — o usuário só não filtrou.
  it("says nothing about a filter left empty", () => {
    const { ignored, applied } = applyFilters(
      SQL,
      [{ field: "regiao", type: "select", values: [] }],
      COLUMNS
    );
    expect(applied).toEqual([]);
    expect(ignored).toEqual([]);
  });

  it("strips a trailing semicolon that would break the subquery", () => {
    const { sql } = applyFilters(
      `${SQL};`,
      [{ field: "regiao", type: "select", values: ["Sul"] }],
      COLUMNS
    );
    expect(sql).not.toContain(";\n) as atlas_q");
    expect(sql).toContain(") as atlas_q where");
  });

  it("keeps an injected value inside the string literal", () => {
    const { sql } = applyFilters(
      SQL,
      [{ field: "regiao", type: "select", values: ["Sul') or 1=1 --"] }],
      COLUMNS
    );
    expect(sql).toContain(`'Sul'') or 1=1 --'`);
    // Nada escapou para fora das aspas: a cláusula continua sendo um IN só.
    expect(sql.match(/where /g)).toHaveLength(1);
  });
});
