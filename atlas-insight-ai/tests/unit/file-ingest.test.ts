import { describe, expect, it } from "vitest";
import { coerceValue, inferColumnType, parseCsv, sanitizeColumnName } from "@/services/file-ingest";

describe("inferColumnType", () => {
  it("infers integers", () => expect(inferColumnType(["1", "42", "-7"])).toBe("bigint"));
  it("infers floats", () => expect(inferColumnType(["1.5", "2,75", "3"])).toBe("double precision"));
  it("infers booleans", () => expect(inferColumnType(["true", "false", "true"])).toBe("boolean"));
  it("infers dates", () => expect(inferColumnType(["2024-01-01", "2024-02-15"])).toBe("date"));
  it("infers timestamps", () => expect(inferColumnType(["2024-01-01T10:00:00Z"])).toBe("timestamptz"));
  it("falls back to text", () => expect(inferColumnType(["abc", "1"])).toBe("text"));
  it("handles all-null columns", () => expect(inferColumnType([null, "", undefined])).toBe("text"));
});

describe("coerceValue", () => {
  it("coerces numbers", () => {
    expect(coerceValue("1.234,5".replace(".", ""), "double precision")).toBeCloseTo(1234.5);
    expect(coerceValue("42", "bigint")).toBe(42);
  });
  it("coerces booleans including pt-BR", () => {
    expect(coerceValue("sim", "boolean")).toBe(true);
    expect(coerceValue("no", "boolean")).toBe(false);
  });
  it("returns null for empty strings", () => {
    expect(coerceValue("", "text")).toBeNull();
  });
});

describe("sanitizeColumnName", () => {
  it("slugifies headers", () => {
    const used = new Set<string>();
    expect(sanitizeColumnName("Região de Vendas", 0, used)).toBe("regiao_de_vendas");
  });
  it("prefixes numeric-leading names", () => {
    const used = new Set<string>();
    expect(sanitizeColumnName("2024 Revenue", 0, used)).toMatch(/^col_1/);
  });
  it("dedupes collisions", () => {
    const used = new Set<string>();
    expect(sanitizeColumnName("Name", 0, used)).toBe("name");
    expect(sanitizeColumnName("name", 1, used)).toBe("name_2");
  });
  it("suffixes reserved words", () => {
    const used = new Set<string>();
    expect(sanitizeColumnName("select", 0, used)).toBe("select_col");
  });
});

describe("parseCsv", () => {
  it("parses headers, infers types and coerces rows", () => {
    const csv = "Region,Revenue,Date\nNorth,1000,2024-01-01\nSouth,2500.5,2024-01-02\n";
    const parsed = parseCsv(csv);
    expect(parsed.columns).toEqual([
      { name: "region", type: "text" },
      { name: "revenue", type: "double precision" },
      { name: "date", type: "date" },
    ]);
    expect(parsed.rows[0]).toEqual({ region: "North", revenue: 1000, date: "2024-01-01" });
  });

  it("throws on empty files", () => {
    expect(() => parseCsv("")).toThrow();
  });
});
