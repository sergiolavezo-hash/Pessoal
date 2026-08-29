"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { DashboardFilter, FilterValue } from "@/dashboards/filters";

/**
 * Controles de filtro, usados tanto na barra do painel quanto no menu de um
 * widget só.
 *
 * Só aparecem filtros que realmente funcionam naquele contexto — a lista de
 * campos é montada a partir das colunas que a consulta devolve. Mostrar um
 * filtro inaplicável faria o usuário mexer, o número não mudar, e ele parar
 * de confiar na tela.
 */
export function FilterControls({
  filters,
  values,
  onChange,
  compact = false,
}: {
  filters: DashboardFilter[];
  values: FilterValue[];
  onChange: (next: FilterValue[]) => void;
  compact?: boolean;
}) {
  if (filters.length === 0) return null;

  function valueFor(field: string): FilterValue | undefined {
    return values.find((v) => v.field === field);
  }

  function update(field: string, type: DashboardFilter["type"], patch: Partial<FilterValue>) {
    const rest = values.filter((v) => v.field !== field);
    const merged: FilterValue = { field, type, ...valueFor(field), ...patch };

    // Filtro sem escolha some da lista: enviar um vazio faria a consulta
    // carregar uma condição que não filtra nada.
    const empty =
      merged.type === "date_range"
        ? !merged.from && !merged.to
        : (merged.values ?? []).length === 0;

    onChange(empty ? rest : [...rest, merged]);
  }

  const active = values.length > 0;

  return (
    <div className={compact ? "space-y-3" : "flex flex-wrap items-end gap-3"}>
      {filters.map((filter) => {
        const current = valueFor(filter.field);
        return (
          <div key={filter.field} className={compact ? "space-y-1.5" : "space-y-1.5"}>
            <Label className="text-xs text-muted-foreground">{filter.label}</Label>

            {filter.type === "date_range" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="h-9 w-40"
                  value={current?.from ?? ""}
                  onChange={(e) => update(filter.field, filter.type, { from: e.target.value })}
                  aria-label={`${filter.label}: de`}
                />
                <span className="text-xs text-muted-foreground">até</span>
                <Input
                  type="date"
                  className="h-9 w-40"
                  value={current?.to ?? ""}
                  onChange={(e) => update(filter.field, filter.type, { to: e.target.value })}
                  aria-label={`${filter.label}: até`}
                />
              </div>
            ) : (
              <select
                className="flex h-9 w-52 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                multiple={filter.type === "multi_select"}
                value={
                  filter.type === "multi_select"
                    ? (current?.values ?? [])
                    : (current?.values?.[0] ?? "")
                }
                onChange={(e) => {
                  const picked =
                    filter.type === "multi_select"
                      ? [...e.target.selectedOptions].map((o) => o.value)
                      : e.target.value
                        ? [e.target.value]
                        : [];
                  update(filter.field, filter.type, { values: picked });
                }}
                aria-label={filter.label}
              >
                {filter.type === "select" && <option value="">Todos</option>}
                {(filter.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}

      {active && (
        <Button variant="ghost" size="sm" onClick={() => onChange([])}>
          <X />
          Limpar
        </Button>
      )}
    </div>
  );
}
