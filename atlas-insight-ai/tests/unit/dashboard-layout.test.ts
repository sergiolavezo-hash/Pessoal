import { describe, expect, it } from "vitest";
import { applyDashboardLayout, balancedRows, repairWidgetVisual } from "@/dashboards/layout";
import { widgetSchema, type DashboardWidget, type WidgetType } from "@/dashboards/spec";

function widget(id: string, type: WidgetType): DashboardWidget {
  return {
    id,
    type,
    title: id,
    query: { sql: "select 1", metrics: [] },
    yFields: ["v"],
    xField: "c",
    layout: { x: 0, y: 0, w: 6, h: 4 },
  };
}

/** Toda linha da grade precisa somar exatamente 12 colunas, sem sobrepor. */
function assertRowsAreComplete(widgets: DashboardWidget[]) {
  const byRow = new Map<number, DashboardWidget[]>();
  for (const w of widgets) {
    const row = byRow.get(w.layout.y) ?? [];
    row.push(w);
    byRow.set(w.layout.y, row);
  }
  for (const [, row] of byRow) {
    const sorted = [...row].sort((a, b) => a.layout.x - b.layout.x);
    let cursor = 0;
    for (const w of sorted) {
      expect(w.layout.x).toBe(cursor);
      cursor += w.layout.w;
    }
    expect(cursor).toBe(12);
  }
}

describe("balancedRows", () => {
  it("balances the last row instead of leaving an orphan", () => {
    expect(balancedRows(5, 4)).toEqual([3, 2]);
    expect(balancedRows(7, 4)).toEqual([4, 3]);
    expect(balancedRows(4, 4)).toEqual([4]);
    expect(balancedRows(3, 2)).toEqual([2, 1]);
    expect(balancedRows(0, 4)).toEqual([]);
  });
});

describe("applyDashboardLayout", () => {
  it("groups KPIs on top, charts in the middle and tables at the bottom", () => {
    const widgets = [
      widget("t1", "table"),
      widget("c1", "bar"),
      widget("k1", "kpi"),
      widget("c2", "line"),
      widget("k2", "kpi"),
    ];
    const laid = applyDashboardLayout(widgets);
    const yOf = (id: string) => laid.find((w) => w.id === id)!.layout.y;
    expect(yOf("k1")).toBe(0);
    expect(yOf("k2")).toBe(0);
    expect(yOf("c1")).toBeGreaterThan(yOf("k1"));
    expect(yOf("t1")).toBeGreaterThan(yOf("c1"));
    assertRowsAreComplete(laid);
  });

  it("always fills every row completely, whatever the widget mix", () => {
    const mixes: WidgetType[][] = [
      ["kpi"],
      ["kpi", "kpi", "kpi"],
      ["kpi", "kpi", "kpi", "kpi", "kpi"],
      ["bar", "line", "scatter"],
      ["kpi", "kpi", "kpi", "kpi", "line", "bar", "area", "table"],
      ["table", "table"],
    ];
    for (const mix of mixes) {
      const laid = applyDashboardLayout(mix.map((t, i) => widget(`w${i}`, t)));
      expect(laid).toHaveLength(mix.length);
      assertRowsAreComplete(laid);
    }
  });

  it("keeps every widget exactly once", () => {
    const widgets = ["kpi", "kpi", "bar", "line", "table"].map((t, i) =>
      widget(`w${i}`, t as WidgetType)
    );
    const ids = applyDashboardLayout(widgets).map((w) => w.id).sort();
    expect(ids).toEqual(["w0", "w1", "w2", "w3", "w4"]);
  });
});

describe("repairWidgetVisual", () => {
  /**
   * Pizza saiu do produto: comparar ângulos é mais difícil que comparar
   * comprimentos, e uma barra responde a mesma pergunta mais rápido. Painéis
   * antigos com donut continuam abrindo — o tipo é convertido, não recusado,
   * senão o usuário perderia um painel que funcionava.
   */
  it("accepts a legacy donut spec and turns it into a bar", () => {
    const parsed = widgetSchema.parse({
      id: "legacy",
      type: "donut",
      title: "Participação",
      query: { sql: "select 1", metrics: [] },
    });
    expect(parsed.type).toBe("horizontal_bar");
  });

  it("flips crowded bars to horizontal and huge ones to a table", () => {
    expect(repairWidgetVisual(widget("b", "bar"), 20).type).toBe("horizontal_bar");
    expect(repairWidgetVisual(widget("b", "bar"), 8).type).toBe("bar");
    expect(repairWidgetVisual(widget("r", "ranking"), 50).type).toBe("table");
  });

  it("does not call two points a trend", () => {
    expect(repairWidgetVisual(widget("l", "line"), 2).type).toBe("bar");
    expect(repairWidgetVisual(widget("l", "line"), 12).type).toBe("line");
  });

  it("converts a multi-row KPI into a comparison", () => {
    expect(repairWidgetVisual(widget("k", "kpi"), 5).type).toBe("bar");
    expect(repairWidgetVisual(widget("k", "kpi"), 1).type).toBe("kpi");
  });
});
