import { describe, expect, it } from "vitest";
import { parseFormula, metricDependencies, fieldReferences, FormulaError } from "@/metrics/formula";
import { compileMetricToSql, validateMetricFormula } from "@/metrics/engine";
import type { SemanticModel } from "@/semantic/schema";

const model: SemanticModel = {
  name: "Test",
  dialect: "postgres",
  entities: [
    {
      name: "Sales",
      table: "public.sales",
      fields: [
        { name: "Revenue", column: "revenue", fieldType: "MEASURE", synonyms: [] },
        { name: "Cost", column: "cost", fieldType: "MEASURE", synonyms: [] },
        { name: "Order Id", column: "order_id", fieldType: "ATTRIBUTE", synonyms: [] },
        { name: "Region", column: "region", fieldType: "DIMENSION", synonyms: ["território"] },
      ],
    },
  ],
  relationships: [],
};

const quote = (id: string) => `"${id}"`;

describe("parseFormula", () => {
  it("parses aggregations", () => {
    const node = parseFormula("SUM(Sales.revenue)");
    expect(node).toEqual({ kind: "aggregation", aggregation: "SUM", entity: "Sales", field: "revenue" });
  });

  it("parses COUNT(Entity) without field", () => {
    const node = parseFormula("COUNT(Sales)");
    expect(node).toEqual({ kind: "aggregation", aggregation: "COUNT", entity: "Sales", field: null });
  });

  it("parses arithmetic with precedence", () => {
    const node = parseFormula("SUM(Sales.revenue) - SUM(Sales.cost) * 2");
    expect(node.kind).toBe("binary");
    if (node.kind === "binary") {
      expect(node.operator).toBe("-");
      expect(node.right.kind).toBe("binary");
    }
  });

  it("parses metric references", () => {
    expect(metricDependencies(parseFormula("metric(revenue) / metric(orders)"))).toEqual(["revenue", "orders"]);
  });

  it("extracts field references", () => {
    expect(fieldReferences(parseFormula("SUM(Sales.revenue) + AVG(Sales.cost)"))).toEqual([
      { entity: "Sales", field: "revenue" },
      { entity: "Sales", field: "cost" },
    ]);
  });

  it("rejects garbage", () => {
    expect(() => parseFormula("DROP TABLE x")).toThrow(FormulaError);
    expect(() => parseFormula("SUM()")).toThrow(FormulaError);
    expect(() => parseFormula("AVG(Sales)")).toThrow(FormulaError);
  });
});

describe("validateMetricFormula", () => {
  const known = [
    { slug: "revenue", name: "Revenue", formula: "SUM(Sales.revenue)" },
    { slug: "cost", name: "Cost", formula: "SUM(Sales.cost)" },
  ];

  it("validates a correct formula", () => {
    const result = validateMetricFormula("SUM(Sales.revenue)", model, known);
    expect(result.valid).toBe(true);
    expect(result.entities).toEqual(["Sales"]);
  });

  it("rejects unknown entities and fields", () => {
    expect(validateMetricFormula("SUM(Nope.revenue)", model, known).valid).toBe(false);
    expect(validateMetricFormula("SUM(Sales.nope)", model, known).valid).toBe(false);
  });

  it("rejects unknown metric references", () => {
    const result = validateMetricFormula("metric(unknown_metric)", model, known);
    expect(result.valid).toBe(false);
  });

  it("rejects self references", () => {
    expect(validateMetricFormula("metric(revenue) * 2", model, known, "revenue").valid).toBe(false);
  });

  it("detects circular dependencies", () => {
    const circular = [
      { slug: "a", name: "A", formula: "metric(b)" },
      { slug: "b", name: "B", formula: "metric(a)" },
    ];
    expect(validateMetricFormula("metric(b)", model, circular, "a").valid).toBe(false);
  });

  it("resolves fields by synonym", () => {
    expect(validateMetricFormula("COUNT_DISTINCT(Sales.território)", model, known).valid).toBe(true);
  });
});

describe("compileMetricToSql", () => {
  const known = [
    { slug: "revenue", name: "Revenue", formula: "SUM(Sales.revenue)" },
    { slug: "cost", name: "Cost", formula: "SUM(Sales.cost)" },
  ];

  it("compiles simple aggregations", () => {
    expect(compileMetricToSql("SUM(Sales.revenue)", model, known, quote)).toBe('SUM("revenue")');
  });

  it("inlines metric references", () => {
    expect(compileMetricToSql("metric(revenue) - metric(cost)", model, known, quote)).toBe(
      '((SUM("revenue")) - (SUM("cost")))'
    );
  });

  it("protects ratios with NULLIF", () => {
    const sql = compileMetricToSql("metric(revenue) / metric(cost)", model, known, quote);
    expect(sql).toContain("NULLIF");
  });

  it("compiles COUNT(*) and COUNT DISTINCT", () => {
    expect(compileMetricToSql("COUNT(Sales)", model, known, quote)).toBe("COUNT(*)");
    expect(compileMetricToSql("COUNT_DISTINCT(Sales.order_id)", model, known, quote)).toBe(
      'COUNT(DISTINCT "order_id")'
    );
  });
});
