import type { DashboardWidget, WidgetType } from "@/dashboards/spec";

// Layout determinístico. Pedir posições (x/y/w/h) a um LLM produz linhas
// desalinhadas, buracos e sobreposições — ele não "vê" o resultado. Aqui a IA
// escolhe O QUE mostrar e nós decidimos ONDE, garantindo que toda linha soma
// exatamente 12 colunas e que cada faixa tem altura uniforme.

const GRID_COLUMNS = 12;
const KPI_HEIGHT = 2;
const CHART_HEIGHT = 4;
const TABLE_HEIGHT = 5;

/** Larguras que dividem a grade em partes iguais. */
const EVEN_WIDTHS: Record<number, number> = { 1: 12, 2: 6, 3: 4, 4: 3 };

/** Gráficos que só fazem sentido ocupando a linha inteira. */
const FULL_WIDTH_TYPES = new Set<WidgetType>(["table", "heatmap", "funnel"]);

type Band = "kpi" | "chart" | "full";

function bandOf(type: WidgetType): Band {
  if (type === "kpi") return "kpi";
  if (FULL_WIDTH_TYPES.has(type)) return "full";
  return "chart";
}

/**
 * Distribui `count` itens em linhas de no máximo `perRow`, equilibrando a
 * última linha: 5 KPIs viram 3+2 (larguras 4 e 6), nunca 4+1.
 */
export function balancedRows(count: number, perRow: number): number[] {
  if (count <= 0) return [];
  const rows = Math.ceil(count / perRow);
  const base = Math.floor(count / rows);
  const remainder = count % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Reposiciona todos os widgets preservando a ordem de intenção da IA:
 * indicadores no topo, gráficos no meio, tabelas embaixo.
 */
export function applyDashboardLayout(widgets: DashboardWidget[]): DashboardWidget[] {
  const bands: Record<Band, DashboardWidget[]> = { kpi: [], chart: [], full: [] };
  for (const w of widgets) bands[bandOf(w.type)].push(w);

  const positioned: DashboardWidget[] = [];
  let y = 0;

  const place = (items: DashboardWidget[], perRow: number, height: number) => {
    for (const size of balancedRows(items.length, perRow)) {
      const width = EVEN_WIDTHS[size] ?? Math.floor(GRID_COLUMNS / size);
      let x = 0;
      for (let i = 0; i < size; i++) {
        const widget = items.shift();
        if (!widget) break;
        positioned.push({ ...widget, layout: { x, y, w: width, h: height } });
        x += width;
      }
      y += height;
    }
  };

  place(bands.kpi, 4, KPI_HEIGHT);
  place(bands.chart, 2, CHART_HEIGHT);
  place(bands.full, 1, TABLE_HEIGHT);

  return positioned;
}

/**
 * Corrige o tipo de gráfico com base no formato REAL do resultado — a IA
 * escolhe às cegas, sem saber quantas categorias a consulta devolve. Uma
 * "tendência" de 2 pontos é ilegível.
 */
export function repairWidgetVisual(widget: DashboardWidget, rowCount: number): DashboardWidget {
  const retype = (type: WidgetType) => ({ ...widget, type });

  switch (widget.type) {
    case "kpi":
      // Um indicador precisa de um número só; várias linhas viram comparação.
      return rowCount > 1 && widget.xField ? retype("bar") : widget;
    case "bar":
    case "stacked_bar":
      // Muitas categorias: rótulos horizontais ficam ilegíveis em pé.
      return rowCount > 15 ? retype("horizontal_bar") : widget;
    case "horizontal_bar":
    case "ranking":
      return rowCount > 30 ? retype("table") : widget;
    case "line":
    case "area":
      // Dois pontos não formam tendência.
      return rowCount > 0 && rowCount < 3 ? retype("bar") : widget;
    default:
      return widget;
  }
}
