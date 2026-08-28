"use client";

import type { ReactNode } from "react";
import { CHART_INK, MARK } from "@/dashboards/theme";
import { formatValue, humanizeField } from "@/dashboards/format";

/**
 * Peças compartilhadas por todos os gráficos: tooltip, legenda e estado
 * vazio. Centralizar aqui garante que dois widgets do mesmo painel não
 * apresentem o mesmo número de dois jeitos diferentes.
 */

export interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  format?: string;
  /** Marca de linha (série contínua) em vez de retângulo. */
  markShape?: "line" | "rect";
  /** Total da fatia, para mostrar participação em gráficos de composição. */
  total?: number;
  /** Série única: o título do cartão já diz o que é, o nome só repete. */
  hideNames?: boolean;
}

/**
 * O tooltip lista TODAS as séries daquele X — o ponteiro nunca precisa
 * acertar uma linha para o leitor obter o número. E o valor é o elemento
 * forte: aqui o leitor já sabe qual série é, ele quer a quantia.
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  format,
  markShape = "rect",
  total,
  hideNames,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null);
  if (rows.length === 0) return null;

  return (
    <div className="pointer-events-none min-w-40 max-w-72 rounded-lg border border-border/80 bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      {label != null && label !== "" && (
        <p className="mb-1.5 truncate text-xs font-medium text-muted-foreground">{String(label)}</p>
      )}
      <div className="space-y-1">
        {rows.map((row, i) => {
          const numeric = Number(row.value);
          const share = total && total > 0 && Number.isFinite(numeric) ? numeric / total : null;
          return (
            <div key={`${row.dataKey ?? row.name ?? i}`} className="flex items-baseline gap-2">
              {/* A marca de cor identifica QUAL série. Com uma só, ela não
                  distingue nada — vira enfeite ao lado do número. */}
              {!hideNames && (
                <span
                  aria-hidden
                  className="mt-1 shrink-0 rounded-full"
                  style={{
                    background: row.color ?? CHART_INK.label,
                    width: markShape === "line" ? 12 : 8,
                    height: markShape === "line" ? 2 : 8,
                  }}
                />
              )}
              {!hideNames && (
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {humanizeField(String(row.name ?? row.dataKey ?? ""))}
                </span>
              )}
              <span
                className={`viz-tabular shrink-0 text-xs font-semibold text-popover-foreground ${
                  hideNames ? "flex-1 text-right" : ""
                }`}
              >
                {Number.isFinite(numeric) ? formatValue(numeric, format) : String(row.value)}
                {share != null && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({(share * 100).toFixed(share < 0.1 ? 1 : 0)}%)
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface LegendEntry {
  label: string;
  color: string;
}

/**
 * Legenda sempre presente a partir de duas séries — é o canal confiável de
 * identidade. Com UMA série ela não existe: o título já diz o que está
 * plotado, e uma caixa com um único quadradinho só repete o título.
 * A marca espelha o gráfico: retângulo para barra/área, traço para linha.
 */
export function ChartLegend({
  entries,
  shape = "rect",
}: {
  entries: LegendEntry[];
  shape?: "line" | "rect";
}) {
  if (entries.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
      {entries.map((entry) => (
        <span key={entry.label} className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className="shrink-0"
            style={{
              background: entry.color,
              width: shape === "line" ? 12 : 9,
              height: shape === "line" ? MARK.lineWidth : 9,
              borderRadius: shape === "line" ? 1 : 2,
            }}
          />
          <span className="truncate text-xs text-muted-foreground">{entry.label}</span>
        </span>
      ))}
    </div>
  );
}

/** Escala de um gradiente sequencial — sem ela o heatmap é cor sem unidade. */
export function ScaleLegend({
  steps,
  min,
  max,
  format,
}: {
  steps: readonly string[];
  min: number;
  max: number;
  format?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1 pt-1.5">
      <span className="viz-tabular text-[10px] text-muted-foreground">{formatValue(min, format)}</span>
      <span className="flex h-2 flex-1 overflow-hidden rounded-full">
        {steps.map((step) => (
          <span key={step} className="flex-1" style={{ background: step }} />
        ))}
      </span>
      <span className="viz-tabular text-[10px] text-muted-foreground">{formatValue(max, format)}</span>
    </div>
  );
}

/** Vazio explicado, não uma caixa em branco que parece defeito. */
export function ChartEmptyState({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm text-muted-foreground">{children ?? "Sem dados para este recorte"}</p>
    </div>
  );
}
