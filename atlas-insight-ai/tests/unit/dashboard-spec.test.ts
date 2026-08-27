import { describe, expect, it } from "vitest";
import { dashboardSpecSchema } from "@/dashboards/spec";

const validSpec = {
  name: "Executive Sales",
  dialect: "postgres",
  widgets: [
    {
      id: "w1",
      type: "kpi",
      title: "Revenue",
      query: { sql: "SELECT SUM(revenue) AS revenue FROM sales", metrics: ["revenue"] },
      yFields: ["revenue"],
      format: "currency",
      layout: { x: 0, y: 0, w: 3, h: 2 },
    },
    {
      id: "w2",
      type: "line",
      title: "Revenue trend",
      query: { sql: "SELECT month, SUM(revenue) AS revenue FROM sales GROUP BY month" },
      xField: "month",
      yFields: ["revenue"],
      layout: { x: 0, y: 2, w: 6, h: 4 },
    },
  ],
};

describe("dashboardSpecSchema", () => {
  it("accepts a valid spec", () => {
    const parsed = dashboardSpecSchema.parse(validSpec);
    expect(parsed.widgets).toHaveLength(2);
    expect(parsed.filters).toEqual([]);
    expect(parsed.insights).toEqual([]);
  });

  it("rejects unsupported widget types", () => {
    const bad = {
      ...validSpec,
      widgets: [{ ...validSpec.widgets[0], type: "gauge3d" }],
    };
    expect(dashboardSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects widgets without a query", () => {
    const bad = {
      ...validSpec,
      widgets: [{ id: "w1", type: "kpi", title: "X", layout: { x: 0, y: 0, w: 3, h: 2 } }],
    };
    expect(dashboardSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects out-of-grid layouts", () => {
    const bad = {
      ...validSpec,
      widgets: [{ ...validSpec.widgets[0], layout: { x: 13, y: 0, w: 3, h: 2 } }],
    };
    expect(dashboardSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects empty dashboards", () => {
    expect(dashboardSpecSchema.safeParse({ ...validSpec, widgets: [] }).success).toBe(false);
  });

  it("rejects insight kinds outside the taxonomy", () => {
    const bad = { ...validSpec, insights: [{ kind: "vibes", text: "looks good" }] };
    expect(dashboardSpecSchema.safeParse(bad).success).toBe(false);
  });
});
