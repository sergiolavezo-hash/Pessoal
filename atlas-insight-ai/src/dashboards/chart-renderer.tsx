"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
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
import { formatNumber } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardWidget } from "@/dashboards/spec";

// Fixed categorical assignment order — never cycled (series > 5 fold visually
// into the same tone family via the table fallback).
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface ChartRendererProps {
  widget: Pick<DashboardWidget, "type" | "xField" | "yFields" | "format" | "title">;
  rows: Record<string, unknown>[];
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function inferFields(widget: ChartRendererProps["widget"], rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {});
  const numericKeys = keys.filter((k) => rows.every((r) => r[k] == null || Number.isFinite(Number(r[k]))));
  const xField = widget.xField && keys.includes(widget.xField) ? widget.xField : keys.find((k) => !numericKeys.includes(k)) ?? keys[0];
  let yFields = widget.yFields.filter((f) => keys.includes(f));
  if (yFields.length === 0) yFields = numericKeys.filter((k) => k !== xField).slice(0, 5);
  return { xField, yFields: yFields.slice(0, 5) };
}

const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" };

function ChartTooltip({ format }: { format?: string }) {
  return (
    <Tooltip
      cursor={{ stroke: "var(--border)", fill: "color-mix(in oklch, var(--muted) 60%, transparent)" }}
      contentStyle={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontSize: 12,
        color: "var(--popover-foreground)",
      }}
      formatter={(value) => formatNumber(toNumber(value), format)}
    />
  );
}

export function ChartRenderer({ widget, rows }: ChartRendererProps) {
  if (rows.length === 0) {
    return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</p>;
  }

  const { xField, yFields } = inferFields(widget, rows);
  const multiSeries = yFields.length > 1;
  const legend = multiSeries ? (
    <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} iconSize={10} />
  ) : null;

  switch (widget.type) {
    case "kpi": {
      const value = toNumber(rows[0]?.[yFields[0]]);
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {formatNumber(value, widget.format)}
          </p>
        </div>
      );
    }

    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
            <XAxis dataKey={xField} tick={axisStyle} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatNumber(toNumber(v), widget.format)} />
            <ChartTooltip format={widget.format} />
            {legend}
            {yFields.map((f, i) => (
              <Line key={f} type="monotone" dataKey={f} stroke={SERIES[i]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case "area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey={xField} tick={axisStyle} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatNumber(toNumber(v), widget.format)} />
            <ChartTooltip format={widget.format} />
            {legend}
            {yFields.map((f, i) => (
              <Area key={f} type="monotone" dataKey={f} stroke={SERIES[i]} strokeWidth={2} fill={SERIES[i]} fillOpacity={0.15} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );

    case "bar":
    case "stacked_bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey={xField} tick={axisStyle} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatNumber(toNumber(v), widget.format)} />
            <ChartTooltip format={widget.format} />
            {legend}
            {yFields.map((f, i) => (
              <Bar
                key={f}
                dataKey={f}
                fill={SERIES[i]}
                stackId={widget.type === "stacked_bar" ? "stack" : undefined}
                radius={widget.type === "stacked_bar" ? 0 : [4, 4, 0, 0]}
                stroke="var(--card)"
                strokeWidth={widget.type === "stacked_bar" ? 2 : 0}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case "horizontal_bar":
    case "ranking": {
      const sorted = [...rows].sort((a, b) => toNumber(b[yFields[0]]) - toNumber(a[yFields[0]])).slice(0, 15);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(toNumber(v), widget.format)} />
            <YAxis type="category" dataKey={xField} tick={{ ...axisStyle, fill: "var(--foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} width={110} />
            <ChartTooltip format={widget.format} />
            <Bar dataKey={yFields[0]} fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={22}>
              <LabelList
                dataKey={yFields[0]}
                position="right"
                style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                formatter={(v) => formatNumber(toNumber(v), widget.format)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "donut": {
      const data = rows.slice(0, 6).map((r) => ({ name: String(r[xField]), value: toNumber(r[yFields[0]]) }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip format={widget.format} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={SERIES[i % SERIES.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case "scatter": {
      const [xf, yf] = yFields.length >= 2 ? yFields : [xField, yFields[0]];
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis type="number" dataKey={xf} name={xf} tick={axisStyle} tickLine={false} />
            <YAxis type="number" dataKey={yf} name={yf} tick={axisStyle} tickLine={false} width={56} />
            <ChartTooltip format={widget.format} />
            <Scatter data={rows} fill={SERIES[0]} fillOpacity={0.8} stroke="var(--card)" strokeWidth={1} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    case "funnel": {
      const data = rows.map((r, i) => ({
        name: String(r[xField]),
        value: toNumber(r[yFields[0]]),
        fill: SERIES[i % SERIES.length],
      }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <ChartTooltip format={widget.format} />
            <Funnel dataKey="value" data={data} isAnimationActive={false}>
              <LabelList dataKey="name" position="right" style={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );
    }

    case "heatmap": {
      // Simple matrix heatmap: x = xField, y = second category, value = yFields[0].
      const keys = Object.keys(rows[0] ?? {});
      const yCat = keys.find((k) => k !== xField && !yFields.includes(k)) ?? xField;
      const valueField = yFields[0];
      const xValues = [...new Set(rows.map((r) => String(r[xField])))].slice(0, 24);
      const yValues = [...new Set(rows.map((r) => String(r[yCat])))].slice(0, 12);
      const max = Math.max(...rows.map((r) => toNumber(r[valueField])), 1);
      const lookup = new Map(rows.map((r) => [`${r[xField]}|${r[yCat]}`, toNumber(r[valueField])]));
      return (
        <div className="h-full overflow-auto">
          <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
            <thead>
              <tr>
                <th />
                {xValues.map((x) => (
                  <th key={x} className="truncate px-1 text-[10px] font-normal text-muted-foreground">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yValues.map((y) => (
                <tr key={y}>
                  <td className="max-w-24 truncate pr-1 text-[10px] text-muted-foreground">{y}</td>
                  {xValues.map((x) => {
                    const v = lookup.get(`${x}|${y}`) ?? 0;
                    return (
                      <td
                        key={x}
                        title={`${x} · ${y}: ${formatNumber(v, widget.format)}`}
                        className="h-6 rounded-sm"
                        style={{
                          background: `color-mix(in oklch, var(--chart-1) ${Math.round((v / max) * 100)}%, var(--muted))`,
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "table":
    default: {
      const keys = Object.keys(rows[0] ?? {});
      return (
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {keys.map((k) => (
                  <TableHead key={k} className="whitespace-nowrap text-xs">
                    {k}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 100).map((r, i) => (
                <TableRow key={i}>
                  {keys.map((k) => {
                    const v = r[k];
                    const numeric = typeof v === "number";
                    return (
                      <TableCell key={k} className={numeric ? "text-right tabular-nums text-xs" : "text-xs"}>
                        {numeric ? formatNumber(v, widget.format) : String(v ?? "—")}
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
  }
}
