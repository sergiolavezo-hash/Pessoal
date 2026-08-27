import Link from "next/link";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GenerateDashboardDialog } from "@/features/dashboards/generate-dialog";
import type { Dashboard } from "@/types";

export const metadata = { title: "Dashboards" };

export default async function DashboardsPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dashboards")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const dashboards = (data ?? []) as Dashboard[];
  const canEdit = ctx.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title="Dashboards"
        description="AI-generated, spec-driven dashboards backed by validated queries."
        actions={canEdit ? <GenerateDashboardDialog workspaceId={ctx.workspace.id} /> : undefined}
      />

      {dashboards.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No dashboards yet"
          description="Describe what you want to analyze and Atlas will design the dashboard for you."
          action={canEdit ? <GenerateDashboardDialog workspaceId={ctx.workspace.id} /> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d) => (
            <Link key={d.id} href={`/dashboards/${d.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{d.name}</p>
                    <Badge variant={d.status === "PUBLISHED" ? "success" : "secondary"}>{d.status}</Badge>
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
                    v{d.version} · Updated {relativeTime(d.updated_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
