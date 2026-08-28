"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  Info,
  Maximize2,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Table2,
  Trash2,
} from "lucide-react";
import { ChartRenderer } from "@/dashboards/chart-renderer";
import type { DashboardSpec, DashboardWidget } from "@/dashboards/spec";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { readJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface WidgetData {
  widgetId: string;
  rows: Record<string, unknown>[];
  rowCount: number;
  executionId?: string;
  error?: string;
}

interface DashboardViewProps {
  workspaceId: string;
  dashboardId: string;
  spec: DashboardSpec;
  canEdit: boolean;
}

/**
 * Altura da faixa por unidade da grade. O cartão precisa caber o gráfico MAIS
 * a faixa de rótulos do eixo: apertar isso é o que cria aquela rolagem
 * vertical minúscula dentro do cartão.
 */
const ROW_HEIGHT = 78;
const KPI_MIN_HEIGHT = 128;

const INSIGHT_LABELS: Record<string, string> = {
  growth: "crescimento",
  decline: "queda",
  trend: "tendência",
  anomaly: "anomalia",
  outlier: "ponto fora",
  concentration: "concentração",
  target_gap: "distância da meta",
  top_performer: "destaque",
  bottom_performer: "atenção",
  observation: "observação",
};

export function DashboardView({ workspaceId, dashboardId, spec, canEdit }: DashboardViewProps) {
  const router = useRouter();
  const [data, setData] = useState<Map<string, WidgetData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [explain, setExplain] = useState<DashboardWidget | null>(null);
  const [fullscreen, setFullscreen] = useState<DashboardWidget | null>(null);
  const [asTable, setAsTable] = useState<Set<string>>(new Set());
  const [instruction, setInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  // Primeira carga mostra esqueleto; recarga SEGURA o desenho anterior com
  // opacidade menor — esqueleto piscando a cada refresh derruba o layout e
  // faz o painel parecer instável.
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    if (!loadedOnce.current) setData(new Map());
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, stream: true }),
      });

      if (!res.ok || !res.body) {
        // Sem corpo transmitido (erro, ou ambiente sem streaming): lê inteiro.
        const json: { data?: WidgetData[]; error?: string } = await readJson<{
          data?: WidgetData[];
          error?: string;
        }>(res).catch((e) => ({
          // Sem JSON (ex.: tempo esgotado): a mensagem do leitor explica
          // melhor do que um texto genérico.
          error: e instanceof Error ? e.message : undefined,
        }));
        if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os dados");
        setData(new Map((json.data ?? []).map((d) => [d.widgetId, d])));
        return;
      }

      // NDJSON: cada linha é um widget pronto. Renderiza na hora, em vez de
      // esperar o gráfico mais lento para mostrar qualquer coisa.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const apply = (line: string) => {
        if (!line.trim()) return;
        const parsedLine = JSON.parse(line) as WidgetData & { error?: string };
        if (!parsedLine.widgetId) {
          if (parsedLine.error) toast.error(parsedLine.error);
          return;
        }
        setData((current) => new Map(current).set(parsedLine.widgetId, parsedLine));
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) apply(line);
      }
      apply(buffer);
      loadedOnce.current = true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível carregar os dados do painel"
      );
    } finally {
      setLoading(false);
    }
  }, [dashboardId, workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedWidgets = useMemo(
    () => [...spec.widgets].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x),
    [spec.widgets]
  );

  function toggleTable(widgetId: string) {
    setAsTable((current) => {
      const next = new Set(current);
      if (next.has(widgetId)) next.delete(widgetId);
      else next.add(widgetId);
      return next;
    });
  }

  async function askAtlas() {
    if (!instruction.trim()) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, instruction }),
      });
      const json = await readJson<{ data?: WidgetData[]; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Não foi possível aplicar a alteração");
      toast.success("Painel atualizado pelo Atlas");
      setInstruction("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível aplicar a alteração",
        { duration: 10000 }
      );
    } finally {
      setEditing(false);
    }
  }

  async function patchSpec(newSpec: DashboardSpec, summary: string) {
    const res = await fetch(`/api/dashboards/${dashboardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, spec: newSpec, changeSummary: summary }),
    });
    const json = await readJson<{ data?: WidgetData[]; error?: string }>(res);
    if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar");
    router.refresh();
  }

  async function removeWidget(widget: DashboardWidget) {
    try {
      await patchSpec(
        { ...spec, widgets: spec.widgets.filter((w) => w.id !== widget.id) },
        `Removeu o visual "${widget.title}"`
      );
      toast.success(`"${widget.title}" removido`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover");
    }
  }

  async function duplicateWidget(widget: DashboardWidget) {
    const copy: DashboardWidget = {
      ...widget,
      id: `${widget.id}_copy_${Date.now().toString(36)}`,
      title: `${widget.title} (cópia)`,
      layout: { ...widget.layout, y: widget.layout.y + widget.layout.h },
    };
    try {
      await patchSpec(
        { ...spec, widgets: [...spec.widgets, copy] },
        `Duplicou o visual "${widget.title}"`
      );
      toast.success(`"${widget.title}" duplicado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível duplicar");
    }
  }

  function renderWidget(widget: DashboardWidget, options?: { fullHeight?: boolean }) {
    const wd = data.get(widget.id);
    const isKpi = widget.type === "kpi";
    const showingTable = asTable.has(widget.id);
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-medium",
                // No indicador o título é a legenda do número: fica menor e
                // discreto, para o valor ser a primeira coisa lida.
                isKpi ? "text-xs uppercase tracking-wide text-muted-foreground" : "text-sm"
              )}
              title={widget.title}
            >
              {widget.title}
            </p>
            {widget.description && !isKpi && (
              <p className="truncate text-xs text-muted-foreground" title={widget.description}>
                {widget.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Ações do visual"
              className="-mr-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setExplain(widget)}>
                <Info /> Como foi calculado?
              </DropdownMenuItem>
              {!isKpi && (
                <DropdownMenuItem onSelect={() => toggleTable(widget.id)}>
                  <Table2 /> {showingTable ? "Ver gráfico" : "Ver como tabela"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => setFullscreen(widget)}>
                <Maximize2 /> Tela cheia
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuItem onSelect={() => duplicateWidget(widget)}>
                    <Copy /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => removeWidget(widget)}
                  >
                    <Trash2 /> Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 px-4 pb-4 pt-2",
            options?.fullHeight && "h-full",
            // Recarga: segura o desenho anterior mais apagado, sem pulo de
            // layout e sem piscar esqueleto.
            loading && wd && "opacity-60 transition-opacity"
          )}
        >
          {!wd ? (
            loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Button variant="outline" size="sm" onClick={load}>
                  <RefreshCw /> Carregar
                </Button>
              </div>
            )
          ) : wd.error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-destructive">{wd.error}</p>
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCw /> Tentar de novo
              </Button>
            </div>
          ) : (
            <ChartRenderer widget={widget} rows={wd.rows ?? []} tableView={showingTable} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {canEdit && (
        <form
          className="mb-5 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            askAtlas();
          }}
        >
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='Peça uma mudança ao Atlas… ex.: "compare com o ano anterior" ou "mostre só os 10 maiores"'
              className="pl-9"
              disabled={editing}
            />
          </div>
          <Button type="submit" loading={editing} disabled={!instruction.trim()}>
            {editing ? "Aplicando…" : "Pedir ao Atlas"}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-4">
        {sortedWidgets.map((widget) => {
          const isKpi = widget.type === "kpi";
          return (
            <div
              key={widget.id}
              className={cn(
                "group overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] transition-shadow hover:shadow-[0_2px_4px_rgba(16,24,40,0.06),0_4px_12px_rgba(16,24,40,0.08)]",
                // Indicadores ocupam meia largura já no celular; gráficos
                // ficam com a linha inteira, senão nada é legível.
                isKpi ? "col-span-1" : "col-span-2",
                "md:[grid-column:span_var(--w)]"
              )}
              style={
                {
                  "--w": widget.layout.w,
                  minHeight: isKpi ? KPI_MIN_HEIGHT : widget.layout.h * ROW_HEIGHT,
                } as React.CSSProperties
              }
            >
              {renderWidget(widget)}
            </div>
          );
        })}
      </div>

      {spec.insights.length > 0 && (
        <section className="mt-6 rounded-xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />O que o Atlas percebeu
          </h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {spec.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="mr-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    {INSIGHT_LABELS[insight.kind] ?? insight.kind.replaceAll("_", " ")}
                  </span>
                  <span className="text-foreground/90">{insight.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={explain !== null} onOpenChange={(o) => !o && setExplain(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Como o Atlas calculou “{explain?.title}”</DialogTitle>
            <DialogDescription>
              Transparência: modelo → métrica → consulta → resultado.
            </DialogDescription>
          </DialogHeader>
          {explain && (
            <div className="space-y-4 text-sm">
              {explain.query.explanation && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Explicação
                  </p>
                  <p className="text-muted-foreground">{explain.query.explanation}</p>
                </div>
              )}
              {explain.query.metrics.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Métricas usadas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {explain.query.metrics.map((m) => (
                      <span
                        key={m}
                        className="rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Consulta
                </p>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {explain.query.sql}
                </pre>
              </div>
              {data.get(explain.id)?.executionId && (
                <p className="text-xs text-muted-foreground">
                  Execução <code>{data.get(explain.id)?.executionId}</code> ·{" "}
                  {data.get(explain.id)?.rowCount} linha(s)
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={fullscreen !== null} onOpenChange={(o) => !o && setFullscreen(null)}>
        <DialogContent className="flex h-[82vh] flex-col sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{fullscreen?.title}</DialogTitle>
            {fullscreen?.description && (
              <DialogDescription>{fullscreen.description}</DialogDescription>
            )}
          </DialogHeader>
          {fullscreen && (
            <div className="min-h-0 flex-1">
              <ChartRenderer
                widget={fullscreen}
                rows={data.get(fullscreen.id)?.rows ?? []}
                tableView={asTable.has(fullscreen.id)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
