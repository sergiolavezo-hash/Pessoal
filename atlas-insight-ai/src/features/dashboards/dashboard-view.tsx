"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Info, Maximize2, MoreHorizontal, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { ChartRenderer } from "@/dashboards/chart-renderer";
import type { DashboardSpec, DashboardWidget } from "@/dashboards/spec";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

export function DashboardView({ workspaceId, dashboardId, spec, canEdit }: DashboardViewProps) {
  const router = useRouter();
  const [data, setData] = useState<Map<string, WidgetData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [explain, setExplain] = useState<DashboardWidget | null>(null);
  const [fullscreen, setFullscreen] = useState<DashboardWidget | null>(null);
  const [instruction, setInstruction] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load data");
      setData(new Map((json.data as WidgetData[]).map((d) => [d.widgetId, d])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard data");
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

  async function askAtlas() {
    if (!instruction.trim()) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, instruction }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Edit failed");
      toast.success("Dashboard updated by Atlas");
      setInstruction("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Edit failed");
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
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Update failed");
    router.refresh();
  }

  async function removeWidget(widget: DashboardWidget) {
    try {
      await patchSpec(
        { ...spec, widgets: spec.widgets.filter((w) => w.id !== widget.id) },
        `Removed widget "${widget.title}"`
      );
      toast.success(`Removed "${widget.title}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove widget");
    }
  }

  async function duplicateWidget(widget: DashboardWidget) {
    const copy: DashboardWidget = {
      ...widget,
      id: `${widget.id}_copy_${Date.now().toString(36)}`,
      title: `${widget.title} (copy)`,
      layout: { ...widget.layout, y: widget.layout.y + widget.layout.h },
    };
    try {
      await patchSpec({ ...spec, widgets: [...spec.widgets, copy] }, `Duplicated widget "${widget.title}"`);
      toast.success(`Duplicated "${widget.title}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate widget");
    }
  }

  function renderWidget(widget: DashboardWidget, heightPx?: number) {
    const wd = data.get(widget.id);
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-2 px-4 pt-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{widget.title}</p>
            {widget.description && (
              <p className="truncate text-xs text-muted-foreground">{widget.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setExplain(widget)}>
                <Info /> How was this calculated?
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFullscreen(widget)}>
                <Maximize2 /> Fullscreen
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuItem onSelect={() => duplicateWidget(widget)}>
                    <Copy /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onSelect={() => removeWidget(widget)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="min-h-0 flex-1 p-4 pt-2" style={heightPx ? { height: heightPx } : undefined}>
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : wd?.error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-destructive">{wd.error}</p>
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCw /> Retry
              </Button>
            </div>
          ) : (
            <ChartRenderer widget={widget} rows={wd?.rows ?? []} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {canEdit && (
        <form
          className="mb-4 flex items-center gap-2"
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
              placeholder='Ask Atlas to change this dashboard… e.g. "Add a year-over-year comparison" or "Show only the top 10 salespeople"'
              className="pl-9"
              disabled={editing}
            />
          </div>
          <Button type="submit" loading={editing} disabled={!instruction.trim()}>
            {editing ? "Applying…" : "Ask Atlas"}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-12 gap-4">
        {sortedWidgets.map((widget) => (
          <Card
            key={widget.id}
            className="col-span-12 overflow-hidden md:[grid-column:span_var(--w)]"
            style={
              {
                "--w": widget.layout.w,
                minHeight: widget.layout.h * 72,
              } as React.CSSProperties
            }
          >
            {renderWidget(widget)}
          </Card>
        ))}
      </div>

      {spec.insights.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="mb-3 text-sm font-medium">Insights</p>
          <ul className="space-y-2">
            {spec.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="mt-0.5 shrink-0">
                  {insight.kind.replaceAll("_", " ")}
                </Badge>
                <span className="text-muted-foreground">{insight.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={explain !== null} onOpenChange={(o) => !o && setExplain(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>How Atlas calculated “{explain?.title}”</DialogTitle>
            <DialogDescription>Transparency: model → metric → query → result.</DialogDescription>
          </DialogHeader>
          {explain && (
            <div className="space-y-4 text-sm">
              {explain.query.explanation && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Explanation
                  </p>
                  <p className="text-muted-foreground">{explain.query.explanation}</p>
                </div>
              )}
              {explain.query.metrics.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Metrics used
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {explain.query.metrics.map((m) => (
                      <Badge key={m} variant="outline">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Query</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {explain.query.sql}
                </pre>
              </div>
              {data.get(explain.id)?.executionId && (
                <p className="text-xs text-muted-foreground">
                  Execution ID: <code>{data.get(explain.id)?.executionId}</code> ·{" "}
                  {data.get(explain.id)?.rowCount} rows
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={fullscreen !== null} onOpenChange={(o) => !o && setFullscreen(null)}>
        <DialogContent className="h-[80vh] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{fullscreen?.title}</DialogTitle>
          </DialogHeader>
          {fullscreen && (
            <div className="h-full min-h-0">
              <ChartRenderer widget={fullscreen} rows={data.get(fullscreen.id)?.rows ?? []} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
