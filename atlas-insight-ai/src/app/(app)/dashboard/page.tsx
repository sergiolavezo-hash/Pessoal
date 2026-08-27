import Link from "next/link";
import { Bot, Database, LayoutDashboard, Sigma, Table2, FileText } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();
  const ws = ctx.workspace.id;

  const [dataSources, dashboards, metrics, tables, aiRuns, recentDashboards, recentSources, auditEvents] =
    await Promise.all([
      supabase.from("data_sources").select("id", { count: "exact", head: true }).eq("workspace_id", ws).is("deleted_at", null),
      supabase.from("dashboards").select("id", { count: "exact", head: true }).eq("workspace_id", ws).is("deleted_at", null),
      supabase.from("metrics").select("id", { count: "exact", head: true }).eq("workspace_id", ws).is("deleted_at", null),
      supabase.from("catalog_tables").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
      supabase.from("ai_runs").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
      supabase.from("dashboards").select("id, name, updated_at").eq("workspace_id", ws).is("deleted_at", null).order("updated_at", { ascending: false }).limit(5),
      supabase.from("data_sources").select("id, name, type, status, last_sync_at").eq("workspace_id", ws).is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
      supabase.from("audit_logs").select("id, action, resource_type, created_at").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(8),
    ]);

  const stats = [
    { label: "Data Sources", value: dataSources.count ?? 0, icon: Database, href: "/data-sources" },
    { label: "Dashboards", value: dashboards.count ?? 0, icon: LayoutDashboard, href: "/dashboards" },
    { label: "Metrics", value: metrics.count ?? 0, icon: Sigma, href: "/metrics" },
    { label: "Tables", value: tables.count ?? 0, icon: Table2, href: "/data-model" },
    { label: "AI Analyses", value: aiRuns.count ?? 0, icon: Bot, href: "/ai-analyst" },
  ];

  const isEmpty = (dataSources.count ?? 0) === 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back${ctx.profile.full_name ? `, ${ctx.profile.full_name.split(" ")[0]}` : ""}`}
        description={`Workspace: ${ctx.workspace.name}`}
      />

      {isEmpty && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-medium">Connect your first data source</p>
              <p className="text-sm text-muted-foreground">
                Atlas will discover your schema, profile your data and build a semantic model automatically.
              </p>
            </div>
            <Button asChild>
              <Link href="/data-sources">Connect data</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <s.icon className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{s.label}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Dashboards</CardTitle>
          </CardHeader>
          <CardContent>
            {(recentDashboards.data ?? []).length === 0 ? (
              <EmptyState icon={LayoutDashboard} title="No dashboards yet" className="border-0 p-6" />
            ) : (
              <ul className="space-y-2">
                {(recentDashboards.data ?? []).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dashboards/${d.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{relativeTime(d.updated_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Data Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {(recentSources.data ?? []).length === 0 ? (
              <EmptyState icon={Database} title="No data sources yet" className="border-0 p-6" />
            ) : (
              <ul className="space-y-2">
                {(recentSources.data ?? []).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/data-sources/${s.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="truncate">{s.name}</span>
                      <Badge variant={s.status === "CONNECTED" ? "success" : s.status === "ERROR" ? "destructive" : "secondary"}>
                        {s.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(auditEvents.data ?? []).length === 0 ? (
              <EmptyState icon={FileText} title="No activity yet" className="border-0 p-6" />
            ) : (
              <ul className="space-y-2">
                {(auditEvents.data ?? []).map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-2 py-1 text-sm">
                    <span className="truncate text-muted-foreground">
                      {e.action.replaceAll("_", " ")}
                      {e.resource_type ? ` · ${e.resource_type}` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
