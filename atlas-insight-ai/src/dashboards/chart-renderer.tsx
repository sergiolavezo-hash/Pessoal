"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardWidget } from "@/dashboards/spec";
import {
  ChartEmptyState,
  ChartLegend,
  ChartTooltipContent,
  ScaleLegend,
  type LegendEntry,
} from "@/dashboards/chart-parts";
import {
  formatCompact,
  formatValue,
  humanizeField,
  niceScale,
  shortenLabel,
} from "@/dashboards/format";
import {
  AXIS_TICK,
  CHART_INK,
  MARK,
  MAX_SERIES,
  OTHER_COLOR,
  SEQUENTIAL_RAMP,
  sequentialStep,
  seriesColor,
} from "@/dashboards/theme";

interface ChartRendererProps {
  widget: Pick<DashboardWidget, "type" | "xField" | "yFields" | "format" | "title">;
  rows: Record<string, unknown>[];
  /** Gêmea acessível: mostra a tabela em vez do gráfico, mesmos dados. */
  tableView?: boolean;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function inferFields(widget: ChartRendererProps["widget"], rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {});
  const numericKeys = keys.filter((k) =>
    rows.every((r) => r[k] == null || Number.isFinite(Number(r[k])))
  );
  const xField =
    widget.xField && keys.includes(widget.xField)
      ? widget.xField
      : keys.find((k) => !numericKeys.includes(k)) ?? keys[0];
  let yFields = widget.yFields.filter((f) => keys.includes(f));
  if (yFields.length === 0) yFields = numericKeys.filter((k) => k !== xField).slice(0, MAX_SERIES);
  // Teto de séries: a partir do 9º item nenhuma matiz nova é segura para
  // daltonismo. Cortar é mais honesto do que inventar cor.
  return { xField, yFields: yFields.slice(0, MAX_SERIES), keys };
}

/** Rótulo de categoria legível: nunca o objeto cru, nunca "null". */
function categoryLabel(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value);
}

/**
 * Eixo de categorias: com poucos itens e nomes curtos, tudo cabe deitado.
 * Com nomes longos, inclinar é melhor do que truncar no meio; com muitos
 * itens, saltar marcas é melhor do que empilhar texto ilegível.
 */
function categoryAxisProps(rows: Record<string, unknown>[], xField: string) {
  const labels = rows.map((r) => categoryLabel(r[xField]));
  const longest = labels.reduce((max, l) => Math.max(max, l.length), 0);
  const tilt = labels.length > 6 || longest > 10;
  return {
    tilt,
    props: tilt
      ? {
          angle: -35 as const,
          textAnchor: "end" as const,
          height: 62,
          interval: (labels.length > 18 ? "preserveStartEnd" : 0) as 0 | "preserveStartEnd",
          tickFormatter: (v: unknown) => shortenLabel(categoryLabel(v), 14),
        }
      : {
          height: 24,
          interval: 0 as const,
          tickFormatter: (v: unknown) => shortenLabel(categoryLabel(v), 16),
        },
  };
}

/** Largura do eixo de valores conforme o maior rótulo — nada de corte. */
function valueAxisWidth(rows: Record<string, unknown>[], fields: string[], format?: string) {
  const widest = rows.reduce((max, row) => {
    for (const f of fields) {
      const text = formatCompact(toNumber(row[f]), format);
      if (text.length > max) max = text.length;
    }
    return max;
  }, 3);
  return Math.min(96, 16 + widest * 7);
}

function legendEntries(fields: string[]): LegendEntry[] {
  return fields.map((f, i) => ({ label: humanizeField(f), color: seriesColor(i) }));
}

const GRID = { stroke: CHART_INK.grid, strokeWidth: 1 } as const;

export function ChartRenderer({ widget, rows, tableView }: ChartRendererProps) {
  const { xField, yFields, keys } = useMemo(() => inferFields(widget, rows), [widget, rows]);

  if (rows.length === 0) return <ChartEmptyState />;
  if (tableView || widget.type === "table") {
    return <DataTable rows={rows} keys={keys} valueFields={yFields} format={widget.format} />;
  }

  const multiSeries = yFields.length > 1;
  const axis = categoryAxisProps(rows, xField);
  const yWidth = valueAxisWidth(rows, yFields, widget.format);
  // Empilhado compara o TOTAL da barra; a escala precisa caber a soma, não a
  // maior parcela, senão a barra estoura o topo do gráfico.
  const stackedTotals =
    widget.type === "stacked_bar"
      ? rows.map((r) => yFields.reduce((sum, f) => sum + toNumber(r[f]), 0))
      : rows.flatMap((r) => yFields.map((f) => toNumber(r[f])));
  const scale = niceScale(stackedTotals);
  const tooltip = (markShape: "line" | "rect", total?: number) => (
    <Tooltip
      // Em barras a marca É o alvo: a barra sob o cursor clareia (activeBar) e
      // a faixa cinza atrás dela só sujaria o gráfico. Em linha/área a mira
      // vertical é que acha o X para o leitor.
      cursor={markShape === "line" ? { stroke: CHART_INK.axis, strokeWidth: 1 } : false}
      content={
        <ChartTooltipContent
          format={widget.format}
          markShape={markShape}
          total={total}
          hideNames={!multiSeries}
        />
      }
    />
  );

  switch (widget.type) {
    case "kpi":
      return <StatTile widget={widget} rows={rows} xField={xField} yField={yFields[0]} />;

    case "line":
      return (
        <ChartFrame legend={<ChartLegend entries={legendEntries(yFields)} shape="line" />}>
          <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis
              dataKey={xField}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
              tickMargin={8}
              {...axis.props}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={yWidth}
              tickMargin={4}
              domain={scale.domain}
              ticks={scale.ticks}
              tickFormatter={(v) => formatCompact(toNumber(v), widget.format)}
            />
            {tooltip("line")}
            {yFields.map((f, i) => (
              <Line
                key={f}
                type="monotone"
                dataKey={f}
                stroke={seriesColor(i)}
                strokeWidth={MARK.lineWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                // Anel na cor da superfície: o ponto continua legível onde
                // cruza outra linha.
                activeDot={{ r: MARK.dotRadius, stroke: CHART_INK.surface, strokeWidth: MARK.gap }}
              >
                {/* Rótulo direto só na ponta e só quando há uma série: um
                    número em cada ponto vira ruído e ninguém lê. */}
                {!multiSeries && rows.length <= 24 && (
                  <LabelList
                    dataKey={f}
                    position="top"
                    offset={10}
                    content={(props) => (
                      <EndLabel {...props} last={rows.length - 1} format={widget.format} />
                    )}
                  />
                )}
              </Line>
            ))}
          </LineChart>
        </ChartFrame>
      );

    case "area":
      return (
        <ChartFrame legend={<ChartLegend entries={legendEntries(yFields)} />}>
          <AreaChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis
              dataKey={xField}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
              tickMargin={8}
              {...axis.props}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={yWidth}
              tickMargin={4}
              domain={scale.domain}
              ticks={scale.ticks}
              tickFormatter={(v) => formatCompact(toNumber(v), widget.format)}
            />
            {tooltip("line")}
            {yFields.map((f, i) => (
              <Area
                key={f}
                type="monotone"
                dataKey={f}
                stroke={seriesColor(i)}
                strokeWidth={MARK.lineWidth}
                fill={seriesColor(i)}
                // Lavagem, nunca bloco saturado: a borda é que carrega a série.
                fillOpacity={MARK.areaOpacity}
                stackId={multiSeries ? "stack" : undefined}
                activeDot={{ r: MARK.dotRadius, stroke: CHART_INK.surface, strokeWidth: MARK.gap }}
              />
            ))}
          </AreaChart>
        </ChartFrame>
      );

    case "bar":
    case "stacked_bar": {
      const stacked = widget.type === "stacked_bar";
      const labelled = !multiSeries && rows.length <= 12;
      return (
        <ChartFrame legend={<ChartLegend entries={legendEntries(yFields)} />}>
          <BarChart
            data={rows}
            margin={{ top: labelled ? 18 : 8, right: 16, left: 0, bottom: 0 }}
            barCategoryGap="28%"
            barGap={MARK.gap}
          >
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis
              dataKey={xField}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
              tickMargin={8}
              {...axis.props}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={yWidth}
              tickMargin={4}
              domain={scale.domain}
              ticks={scale.ticks}
              tickFormatter={(v) => formatCompact(toNumber(v), widget.format)}
            />
            {tooltip("rect")}
            {yFields.map((f, i) => (
              <Bar
                key={f}
                dataKey={f}
                fill={seriesColor(i)}
                stackId={stacked ? "stack" : undefined}
                // Ponta arredondada, base reta na linha zero.
                radius={stacked ? 0 : [MARK.barRadius, MARK.barRadius, 0, 0]}
                // Traço na COR DA SUPERFÍCIE: é o vão de 2px que separa os
                // segmentos empilhados, não uma borda desenhada em volta.
                stroke={stacked ? CHART_INK.surface : undefined}
                strokeWidth={stacked ? MARK.gap : 0}
                maxBarSize={MARK.maxBarSize}
                activeBar={{ fillOpacity: 0.82 }}
              >
                {labelled && (
                  <LabelList
                    dataKey={f}
                    position="top"
                    offset={6}
                    style={{ fontSize: 11, fill: CHART_INK.label }}
                    formatter={(v: unknown) => formatCompact(toNumber(v), widget.format)}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ChartFrame>
      );
    }

    case "horizontal_bar":
    case "ranking": {
      const field = yFields[0];
      const sorted = [...rows].sort((a, b) => toNumber(b[field]) - toNumber(a[field])).slice(0, 15);
      const longest = sorted.reduce((m, r) => Math.max(m, categoryLabel(r[xField]).length), 0);
      const labelWidth = Math.min(180, Math.max(72, longest * 6.6 + 10));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 64, left: 4, bottom: 4 }}
            barCategoryGap="30%"
          >
            <CartesianGrid {...GRID} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              height={20}
              domain={scale.domain}
              ticks={scale.ticks}
              tickFormatter={(v) => formatCompact(toNumber(v), widget.format)}
            />
            <YAxis
              type="category"
              dataKey={xField}
              tick={{ ...AXIS_TICK, fill: CHART_INK.foreground }}
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
              width={labelWidth}
              tickFormatter={(v) => shortenLabel(categoryLabel(v), Math.floor(labelWidth / 6.6))}
            />
            {tooltip("rect")}
            {/* Uma série, uma cor: escurecer a barra maior seria codificar o
                comprimento duas vezes e queimar o único canal livre. */}
            <Bar
              dataKey={field}
              fill={seriesColor(0)}
              radius={[0, MARK.barRadius, MARK.barRadius, 0]}
              maxBarSize={MARK.maxBarSize}
              activeBar={{ fillOpacity: 0.82 }}
            >
              <LabelList
                dataKey={field}
                position="right"
                offset={8}
                style={{ fontSize: 11, fill: CHART_INK.label }}
                formatter={(v: unknown) => formatCompact(toNumber(v), widget.format)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "donut": {
      // Parte-do-todo só funciona de relance: acima de 6 fatias o olho não
      // compara ângulos. O excedente vira "Outros" em vez de virar confete.
      const field = yFields[0];
      const ordered = [...rows].sort((a, b) => toNumber(b[field]) - toNumber(a[field]));
      const head = ordered.slice(0, 5).map((r) => ({
        name: categoryLabel(r[xField]),
        value: toNumber(r[field]),
      }));
      const tail = ordered.slice(5);
      const data =
        tail.length > 0
          ? [...head, { name: `Outros (${tail.length})`, value: tail.reduce((s, r) => s + toNumber(r[field]), 0) }]
          : head;
      const total = data.reduce((s, d) => s + d.value, 0);
      const sliceColor = (i: number) =>
        i === data.length - 1 && tail.length > 0 ? OTHER_COLOR : seriesColor(i);
      return (
        <ChartFrame
          legend={
            <ChartLegend entries={data.map((d, i) => ({ label: d.name, color: sliceColor(i) }))} />
          }
          // O buraco do donut é espaço morto; o total ali dá o denominador
          // que faz cada fatia significar alguma coisa.
          overlay={
            <div className="pointer-events-none flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
              <span className="viz-figure text-lg font-semibold">
                {formatCompact(total, widget.format)}
              </span>
            </div>
          }
        >
          <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            {tooltip("rect", total)}
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={1}
              stroke={CHART_INK.surface}
              strokeWidth={MARK.gap}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={sliceColor(i)} />
              ))}
              {/* Participação escrita fora da fatia: a cor sozinha não diz
                  quanto, e três das matizes claras não alcançam contraste de
                  texto sobre o branco. */}
              <LabelList
                dataKey="value"
                position="outside"
                offset={10}
                style={{ fontSize: 11, fill: CHART_INK.label }}
                formatter={(v: unknown) =>
                  total > 0 ? `${Math.round((toNumber(v) / total) * 100)}%` : ""
                }
              />
            </Pie>
          </PieChart>
        </ChartFrame>
      );
    }

    case "scatter": {
      const [xf, yf] = yFields.length >= 2 ? yFields : [xField, yFields[0]];
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid {...GRID} />
            <XAxis
              type="number"
              dataKey={xf}
              name={xf}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
              height={24}
              tickFormatter={(v) => formatCompact(toNumber(v), widget.format)}
            />
            <YAxis
              type="number"
              dataKey={yf}
              name={yf}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={yWidth}
              tickFormatter={(v) => formatCompact(toNumber(v), widget.format)}
            />
            {tooltip("rect")}
            {/* Anel de 2px na cor da superfície: pontos sobrepostos continuam
                contáveis, e o anel também aumenta a área de acerto do mouse. */}
            <Scatter
              data={rows}
              fill={seriesColor(0)}
              fillOpacity={0.85}
              stroke={CHART_INK.surface}
              strokeWidth={MARK.gap}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    case "funnel":
      return <FunnelBars rows={rows} xField={xField} yField={yFields[0]} format={widget.format} />;

    case "heatmap":
      return <Heatmap rows={rows} xField={xField} yFields={yFields} format={widget.format} />;

    default:
      return <DataTable rows={rows} keys={keys} valueFields={yFields} format={widget.format} />;
  }
}

/** Moldura: legenda acima, gráfico ocupando o resto — sem rolagem interna. */
function ChartFrame({
  legend,
  overlay,
  children,
}: {
  legend: React.ReactNode;
  overlay?: React.ReactNode;
  children: React.ReactElement;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {legend}
      <div className="relative min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
        {overlay && (
          <div className="absolute inset-0 flex items-center justify-center">{overlay}</div>
        )}
      </div>
    </div>
  );
}

/** Rótulo só no último ponto da linha — o resto vive no eixo e no tooltip. */
function EndLabel({
  x,
  y,
  value,
  index,
  last,
  format,
}: {
  x?: number | string;
  y?: number | string;
  // Recharts entrega o valor como "texto renderizável" (pode ser nulo);
  // estreitamos aqui em vez de mentir no tipo.
  value?: unknown;
  index?: number;
  last: number;
  format?: string;
}) {
  if (index !== last || x == null || y == null) return null;
  return (
    <text
      x={Number(x)}
      y={Number(y) - 8}
      textAnchor="end"
      style={{ fontSize: 11, fill: CHART_INK.label }}
    >
      {formatCompact(toNumber(value), format)}
    </text>
  );
}

/**
 * Indicador: o número É o gráfico. Uma barra sozinha num gráfico de barras
 * diz menos e ocupa mais.
 */
function StatTile({
  widget,
  rows,
  xField,
  yField,
}: {
  widget: ChartRendererProps["widget"];
  rows: Record<string, unknown>[];
  xField: string;
  yField: string;
}) {
  const series = rows.map((r) => toNumber(r[yField]));
  // Uma linha: o valor. Várias: o valor é a última, e a série vira contexto.
  const value = series[series.length - 1] ?? 0;
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const trend = series.length > 2 ? series.slice(-12) : null;
  const delta =
    previous != null && previous !== 0 ? (value - previous) / Math.abs(previous) : null;
  const period = series.length > 1 ? categoryLabel(rows[rows.length - 2]?.[xField]) : null;

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <p className="viz-figure text-3xl font-semibold leading-none">
        {formatValue(value, widget.format)}
      </p>
      {delta != null && (
        <p className="flex items-center gap-1 text-xs">
          {/* Direção também por símbolo e texto: cor sozinha não carrega
              significado para quem não a distingue. */}
          <span
            className={
              delta > 0 ? "text-[color:var(--success)]" : delta < 0 ? "text-destructive" : "text-muted-foreground"
            }
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"}{" "}
            {new Intl.NumberFormat("pt-BR", {
              style: "percent",
              maximumFractionDigits: 1,
              signDisplay: "exceptZero",
            }).format(delta)}
          </span>
          {period && <span className="truncate text-muted-foreground">vs {period}</span>}
        </p>
      )}
      {trend && (
        <div className="h-8 w-full" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={seriesColor(0)}
                strokeWidth={MARK.lineWidth}
                fill={seriesColor(0)}
                fillOpacity={MARK.areaOpacity}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/**
 * Funil como barras deitadas: os estágios são uma escala ORDENADA, então a
 * rampa de uma matiz (clara→escura) diz "avança", e a conversão entre etapas
 * fica escrita, não deduzida do ângulo do trapézio.
 */
function FunnelBars({
  rows,
  xField,
  yField,
  format,
}: {
  rows: Record<string, unknown>[];
  xField: string;
  yField: string;
  format?: string;
}) {
  const stages = rows.map((r) => ({ name: categoryLabel(r[xField]), value: toNumber(r[yField]) }));
  const top = Math.max(...stages.map((s) => s.value), 1);
  // O degrau mais claro da rampa ainda precisa se destacar do branco: começar
  // no segundo passo, não no primeiro.
  const ordinal = SEQUENTIAL_RAMP.slice(1);

  return (
    <div className="flex h-full flex-col justify-center gap-2 overflow-auto py-1">
      {stages.map((stage, i) => {
        const share = stage.value / top;
        const step = ordinal[Math.min(ordinal.length - 1, Math.floor((i / Math.max(stages.length - 1, 1)) * ordinal.length))];
        const fromPrevious = i > 0 && stages[i - 1].value > 0 ? stage.value / stages[i - 1].value : null;
        return (
          <div key={`${stage.name}-${i}`} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-muted-foreground">{stage.name}</span>
              <span className="viz-tabular shrink-0 font-medium">
                {formatValue(stage.value, format)}
                {fromPrevious != null && (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {(fromPrevious * 100).toFixed(0)}%
                  </span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(share * 100, 1)}%`, background: step }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Matriz de intensidade: uma matiz, claro→escuro, com escala declarada. */
function Heatmap({
  rows,
  xField,
  yFields,
  format,
}: {
  rows: Record<string, unknown>[];
  xField: string;
  yFields: string[];
  format?: string;
}) {
  const keys = Object.keys(rows[0] ?? {});
  const yCat = keys.find((k) => k !== xField && !yFields.includes(k)) ?? xField;
  const valueField = yFields[0];
  const xValues = [...new Set(rows.map((r) => categoryLabel(r[xField])))].slice(0, 24);
  const yValues = [...new Set(rows.map((r) => categoryLabel(r[yCat])))].slice(0, 14);
  const values = rows.map((r) => toNumber(r[valueField]));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const lookup = new Map(rows.map((r) => [`${categoryLabel(r[xField])}|${categoryLabel(r[yCat])}`, toNumber(r[valueField])]));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-separate" style={{ borderSpacing: MARK.gap }}>
          <thead>
            <tr>
              <th />
              {xValues.map((x) => (
                <th key={x} className="px-1 pb-1 text-[10px] font-normal text-muted-foreground">
                  <span className="block max-w-16 truncate">{x}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yValues.map((y) => (
              <tr key={y}>
                <td className="max-w-28 truncate pr-2 text-[10px] text-muted-foreground">{y}</td>
                {xValues.map((x) => {
                  const v = lookup.get(`${x}|${y}`);
                  return (
                    <td
                      key={x}
                      title={`${x} · ${y}: ${v == null ? "sem dado" : formatValue(v, format)}`}
                      className="h-6 rounded-sm"
                      style={{
                        background:
                          v == null ? "var(--muted)" : sequentialStep((v - min) / (max - min || 1)),
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ScaleLegend steps={SEQUENTIAL_RAMP} min={min} max={max} format={format} />
    </div>
  );
}

/**
 * Tabela: a gêmea acessível de todo gráfico. O formato do widget vale só nas
 * colunas de VALOR — aplicá-lo a tudo transformaria uma coluna de quantidade
 * em reais.
 */
function DataTable({
  rows,
  keys,
  valueFields,
  format,
}: {
  rows: Record<string, unknown>[];
  keys: string[];
  valueFields: string[];
  format?: string;
}) {
  const source = keys.length > 0 ? keys : Object.keys(rows[0] ?? {});
  // Quem é medida se decide pelos DADOS, não pela especificação: o modelo
  // costuma listar todas as colunas em yFields, inclusive as de texto, e aí
  // "categoria" seria alinhada à direita como se fosse dinheiro.
  const numericColumns = new Set(
    source.filter((k) =>
      rows.some((r) => r[k] != null) &&
      rows.every((r) => r[k] == null || (r[k] !== "" && Number.isFinite(Number(r[k]))))
    )
  );
  const declared = new Set(valueFields);
  // Quem lê uma tabela procura primeiro "de quem é a linha" e depois "quanto":
  // dimensões à esquerda, medidas à direita. A ordem crua do SELECT costuma
  // jogar uma coluna de valor no meio dos rótulos.
  const columns = [
    ...source.filter((k) => !numericColumns.has(k)),
    ...source.filter((k) => numericColumns.has(k)),
  ];
  return (
    <div className="h-full overflow-auto rounded-md border border-border/60">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {columns.map((k) => (
              <TableHead
                key={k}
                className={`whitespace-nowrap text-xs ${numericColumns.has(k) ? "text-right" : ""}`}
              >
                {humanizeField(k)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 200).map((r, i) => (
            <TableRow key={i}>
              {columns.map((k) => {
                const v = r[k];
                const numeric = numericColumns.has(k) && v != null && v !== "";
                return (
                  <TableCell
                    key={k}
                    className={numeric ? "viz-tabular text-right text-xs" : "text-xs"}
                  >
                    {/* O formato do widget (moeda, %) vale só nas colunas que ele
                        declarou como valor — aplicá-lo a tudo transformaria
                        uma coluna de quantidade em reais. */}
                    {numeric
                      ? formatValue(Number(v), declared.has(k) ? format : undefined)
                      : categoryLabel(v)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
