import { describe, expect, it } from "vitest";
import { profileColumn } from "@/data-profiler/profiler";
import { detectRelationships, type ProfiledColumnRef } from "@/data-profiler/relationships";

describe("profileColumn", () => {
  it("computes stats for numeric measures", () => {
    const values = [100, 250.5, 300, null, 80];
    const { profile, classification } = profileColumn("revenue", "numeric", values);
    expect(profile.row_count).toBe(5);
    expect(profile.null_percentage).toBeCloseTo(0.2);
    expect(profile.min).toBe(80);
    expect(profile.max).toBe(300);
    expect(classification.classification).toBe("MEASURE");
    expect(classification.confidence).toBeGreaterThan(0.9);
  });

  it("classifies id columns", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const { classification } = profileColumn("customer_id", "integer", values);
    expect(["ID", "FOREIGN_KEY"]).toContain(classification.classification);
  });

  it("classifies foreign keys (repeating entity ids)", () => {
    const values = Array.from({ length: 100 }, (_, i) => (i % 10) + 1);
    const { classification } = profileColumn("customer_id", "integer", values);
    expect(classification.classification).toBe("FOREIGN_KEY");
  });

  it("classifies dates by type", () => {
    const { classification } = profileColumn("created_at", "timestamp with time zone", ["2024-01-01"]);
    expect(classification.classification).toBe("DATE");
    expect(classification.confidence).toBeGreaterThan(0.9);
  });

  it("classifies low-cardinality text as category", () => {
    const values = Array.from({ length: 200 }, (_, i) => ["North", "South", "East", "West"][i % 4]);
    const { classification } = profileColumn("region", "text", values);
    expect(classification.classification).toBe("CATEGORY");
  });

  it("classifies booleans", () => {
    const { classification } = profileColumn("is_active", "boolean", [true, false, true]);
    expect(classification.classification).toBe("BOOLEAN");
  });

  it("every classification carries a confidence between 0 and 1", () => {
    const cases: Array<[string, string, unknown[]]> = [
      ["revenue", "numeric", [1, 2, 3]],
      ["name", "text", ["a", "b", "c"]],
      ["flag", "boolean", [true]],
    ];
    for (const [name, type, values] of cases) {
      const { classification } = profileColumn(name, type, values);
      expect(classification.confidence).toBeGreaterThan(0);
      expect(classification.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("detectRelationships", () => {
  const columns: ProfiledColumnRef[] = [
    { id: "c1", tableId: "t1", tableName: "customers", name: "customer_id", dataType: "integer", classification: "ID", cardinality: 1 },
    { id: "c2", tableId: "t2", tableName: "sales", name: "customer_id", dataType: "integer", classification: "FOREIGN_KEY", cardinality: 0.1 },
    { id: "c3", tableId: "t2", tableName: "sales", name: "revenue", dataType: "numeric", classification: "MEASURE", cardinality: 0.9 },
  ];

  it("detects FK -> PK by matching column names", () => {
    const rels = detectRelationships(columns);
    expect(rels).toHaveLength(1);
    expect(rels[0]).toMatchObject({
      sourceColumnId: "c2",
      targetColumnId: "c1",
      relationshipType: "many-to-one",
    });
    expect(rels[0].confidence).toBeGreaterThan(0.8);
    expect(rels[0].reason).toContain("customer_id");
  });

  it("detects prefix -> table matches (order.customer_id -> customers.id)", () => {
    const cols: ProfiledColumnRef[] = [
      { id: "p1", tableId: "t1", tableName: "customers", name: "id", dataType: "integer", classification: "ID", cardinality: 1 },
      { id: "p2", tableId: "t2", tableName: "orders", name: "customer_id", dataType: "bigint", cardinality: 0.2 },
    ];
    const rels = detectRelationships(cols);
    expect(rels).toHaveLength(1);
    expect(rels[0].targetColumnId).toBe("p1");
  });

  it("ignores incompatible types", () => {
    const cols: ProfiledColumnRef[] = [
      { id: "x1", tableId: "t1", tableName: "customers", name: "customer_id", dataType: "text", classification: "ID", cardinality: 1 },
      { id: "x2", tableId: "t2", tableName: "sales", name: "customer_id", dataType: "numeric", cardinality: 0.1 },
    ];
    expect(detectRelationships(cols)).toHaveLength(0);
  });
});
