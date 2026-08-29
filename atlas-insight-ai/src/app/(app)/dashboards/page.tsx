import Link from "next/link";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime, statusLabel } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GenerateDashboardDialog } from "@/features/dashboards/generate-dialog";
import { ObjectMenu } from "@/components/ui/object-menu";
import type { Dashboard } from "@/types";

export const metadata = { title: "Painéis" };

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  // "Criar painel" dentro de um modelo chega com ele já escolhido.
  const { model: initialModelId } = await searchParams;
  const ctx = await getAppContext();
  const supabase = await createClient();

  const [{ data }, { data: sources }, { data: activeModels }] = await Promise.all([
    supabase
      .from("dashboards")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("data_sources")
      .select("id, name, type")
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .order("created_at"),
    supabase
      .from("semantic_models")
      .select("data_source_id, name, version, created_at")
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "ACTIVE")
      .order("version", { ascending: false }),
  ]);

  // Modelos criados pelo usuário, com a fonte das tabelas de cada um. É o que
  // o seletor de geração passa a oferecer: "Modelo Comercial" diz algo a quem
  // o montou; "Arquivos enviados model v3" é artefato interno do Atlas.
  const { data: userModelRows } = await supabase
    .from("analysis_models")
    .select(
      "id, name, analysis_model_tables(table_id, catalog_tables(datasets(data_source_id)))"
    )
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "ACTIVE")
    .order("updated_at", { ascending: false });

  // O cliente do Supabase tipa relações aninhadas ora como objeto, ora como
  // array conforme a cardinalidade que ele infere; normalizar aqui evita
  // depender de qual das duas formas veio.
  const first = <T,>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? value[0] ?? null : value ?? null;

  const userModels = (userModelRows ?? [])
    .map((m) => {
      const links = (m.analysis_model_tables ?? []) as unknown as Array<{
        catalog_tables:
          | { datasets: { data_source_id: string } | { data_source_id: string }[] | null }
          | { datasets: { data_source_id: string } | { data_source_id: string }[] | null }[]
          | null;
      }>;
      const dataSourceId = links
        .map((l) => first(first(l.catalog_tables)?.datasets)?.data_source_id)
        .find((id): id is string => Boolean(id));
      // Modelo sem fonte resolvível não tem como ancorar a geração.
      if (!dataSourceId) return null;
      return {
        id: m.id as string,
        name: m.name as string,
        dataSourceId,
        tableCount: links.length,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m != null);

  // Um modelo (o mais recente) por fonte; fontes sem modelo usam o esquema bruto.
  const modelBySource = new Map<string, { name: string; version: number }>();
  for (const m of activeModels ?? []) {
    if (!modelBySource.has(m.data_source_id)) {
      modelBySource.set(m.data_source_id, { name: m.name as string, version: m.version as number });
    }
  }

  // Contextos de análise (assuntos, estilo Looker) por fonte. A coluna
  // `context` só existe após a migração 0011 — em caso de erro, sem contextos.
  const sourceIds = (sources ?? []).map((s) => s.id as string);
  const contextsBySource = new Map<string, string[]>();
  if (sourceIds.length > 0) {
    const { data: contextRows, error: contextError } = await supabase
      .from("datasets")
      .select("data_source_id, catalog_tables(name, context)")
      .in("data_source_id", sourceIds);
    if (!contextError) {
      for (const ds of contextRows ?? []) {
        const tables = (ds.catalog_tables ?? []) as Array<{ name: string; context: string | null }>;
        const set = contextsBySource.get(ds.data_source_id as string) ?? [];
        for (const t of tables) {
          const c = t.context ?? t.name;
          if (c && !set.includes(c)) set.push(c);
        }
        contextsBySource.set(ds.data_source_id as string, set);
      }
    }
  }

  const sourceOptions = (sources ?? []).map((s) => {
    const model = modelBySource.get(s.id);
    return {
      id: s.id as string,
      name: s.name as string,
      type: s.type as string,
      hasModel: Boolean(model),
      modelLabel: model ? `${model.name} v${model.version}` : null,
      contexts: (contextsBySource.get(s.id as string) ?? []).sort((a, b) => a.localeCompare(b)),
    };
  });

  const dashboards = (data ?? []) as Dashboard[];
  const canEdit = ctx.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title="Painéis"
        description="Painéis criados pela IA, sempre apoiados em consultas validadas nos seus dados."
        actions={canEdit ? <GenerateDashboardDialog
            workspaceId={ctx.workspace.id}
            sources={sourceOptions}
            models={userModels}
            initialModelId={initialModelId}
          /> : undefined}
      />

      {dashboards.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Nenhum painel ainda"
          description="Descreva o que você quer analisar e o Atlas monta o painel para você."
          action={canEdit ? <GenerateDashboardDialog
            workspaceId={ctx.workspace.id}
            sources={sourceOptions}
            models={userModels}
            initialModelId={initialModelId}
          /> : undefined}
        />
      ) : (
        Object.entries(
          dashboards.reduce<Record<string, Dashboard[]>>((groups, d) => {
            const key = (d as { folder?: string | null }).folder ?? "";
            (groups[key] ??= []).push(d);
            return groups;
          }, {})
        )
          .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
          .map(([folder, group]) => (
            <div key={folder || "__root"} className="mb-6">
              {folder && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  📁 {folder}
                </p>
              )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group.map((d) => (
            <Link key={d.id} href={`/dashboards/${d.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-medium">{d.name}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={d.status === "PUBLISHED" ? "success" : "secondary"}>
                        {statusLabel(d.status)}
                      </Badge>
                      {canEdit && (
                        <ObjectMenu
                          openHref={`/dashboards/${d.id}`}
                          deleteEndpoint={`/api/dashboards/${d.id}?workspaceId=${ctx.workspace.id}`}
                          deleteConfirm={`Delete dashboard "${d.name}"?`}
                          moveEndpoint={`/api/dashboards/${d.id}`}
                          moveBody={{ workspaceId: ctx.workspace.id }}
                          currentFolder={(d as { folder?: string | null }).folder ?? null}
                        />
                      )}
                    </div>
                  </div>
                  {d.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
                  )}
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    {d.generated_by_ai && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Sparkles className="h-3 w-3" /> AI
                      </span>
                    )}
                    v{d.version} · atualizado {relativeTime(d.updated_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
            </div>
          ))
      )}
    </div>
  );
}
