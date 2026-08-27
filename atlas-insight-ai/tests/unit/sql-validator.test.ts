import { describe, expect, it } from "vitest";
import {
  stripLiteralsAndComments,
  validateReadOnlySql,
  validateTableAllowlist,
} from "@/ai/query-engine/sql-validator";

describe("validateReadOnlySql", () => {
  it("accepts a plain SELECT", () => {
    const result = validateReadOnlySql("SELECT id, name FROM public.customers WHERE active = true", "postgres");
    expect(result.valid).toBe(true);
    expect(result.tables).toContain("public.customers");
  });

  it("accepts CTEs", () => {
    const result = validateReadOnlySql(
      "WITH totals AS (SELECT region, SUM(revenue) r FROM sales GROUP BY region) SELECT * FROM totals ORDER BY r DESC",
      "postgres"
    );
    expect(result.valid).toBe(true);
  });

  it.each([
    "INSERT INTO users (id) VALUES (1)",
    "UPDATE users SET name = 'x'",
    "DELETE FROM users",
    "DROP TABLE users",
    "ALTER TABLE users ADD COLUMN x int",
    "TRUNCATE users",
    "CREATE TABLE evil (id int)",
    "MERGE INTO t USING s ON t.id = s.id WHEN MATCHED THEN UPDATE SET x = 1",
  ])("blocks destructive statement: %s", (sql) => {
    expect(validateReadOnlySql(sql, "postgres").valid).toBe(false);
  });

  it("blocks multiple statements", () => {
    const result = validateReadOnlySql("SELECT 1; DROP TABLE users", "postgres");
    expect(result.valid).toBe(false);
  });

  it("blocks stacked statements hidden after comments", () => {
    const result = validateReadOnlySql("SELECT 1 -- ok\n; DELETE FROM users", "postgres");
    expect(result.valid).toBe(false);
  });

  it("allows semicolons inside string literals", () => {
    const result = validateReadOnlySql("SELECT * FROM logs WHERE message = 'a;b'", "postgres");
    expect(result.valid).toBe(true);
  });

  it("blocks SELECT FOR UPDATE", () => {
    expect(validateReadOnlySql("SELECT * FROM users FOR UPDATE", "postgres").valid).toBe(false);
  });

  it("blocks pg_sleep and dangerous functions", () => {
    expect(validateReadOnlySql("SELECT pg_sleep(10)", "postgres").valid).toBe(false);
    expect(validateReadOnlySql("SELECT * FROM t WHERE 1=1 WAITFOR DELAY '0:0:10'", "sqlserver").valid).toBe(false);
  });

  it("rejects empty input", () => {
    expect(validateReadOnlySql("   ", "postgres").valid).toBe(false);
  });

  it("validates BigQuery dialect queries", () => {
    const result = validateReadOnlySql(
      "SELECT region, SUM(revenue) AS total FROM `analytics.sales` GROUP BY region",
      "bigquery"
    );
    expect(result.valid).toBe(true);
  });
});

describe("stripLiteralsAndComments", () => {
  it("removes line comments", () => {
    expect(stripLiteralsAndComments("SELECT 1 -- DROP TABLE x")).not.toContain("DROP");
  });
  it("removes block comments", () => {
    expect(stripLiteralsAndComments("SELECT /* DELETE */ 1")).not.toContain("DELETE");
  });
  it("empties string literal contents", () => {
    const out = stripLiteralsAndComments("SELECT 'DROP TABLE x' FROM t");
    expect(out).not.toContain("DROP");
  });
});

describe("validateTableAllowlist", () => {
  it("accepts allowlisted tables (qualified or bare)", () => {
    expect(validateTableAllowlist(["public.sales", "customers"], ["public.sales", "public.customers"])).toEqual([]);
  });
  it("flags unknown tables", () => {
    expect(validateTableAllowlist(["public.secrets"], ["public.sales"])).toEqual(["public.secrets"]);
  });
});
