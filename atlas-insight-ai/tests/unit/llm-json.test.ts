import { describe, expect, it } from "vitest";
import { extractJson } from "@/ai/llm/types";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses fenced JSON", () => {
    expect(extractJson('Here you go:\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON surrounded by prose", () => {
    expect(extractJson('Sure! {"sql": "SELECT 1", "n": 2} hope that helps')).toEqual({
      sql: "SELECT 1",
      n: 2,
    });
  });

  it("handles nested braces and strings with braces", () => {
    expect(extractJson('{"a": {"b": "{not json}"}}')).toEqual({ a: { b: "{not json}" } });
  });

  it("throws on non-JSON", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
