import Link from "next/link";
import { Database } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NewSourceDialog } from "@/features/data-sources/new-source-dialog";
import { ObjectMenu } from "@/components/ui/object-menu";
import { CONNECTOR_CATALOG } from "@/features/data-sources/connector-catalog";
import type { DataSource } from "@/types";

export const metadata = { title: "Data Sources" };

export default async function DataSourcesPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("data_sources")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const sources = (data ?? []) as DataSource[];
  const canEdit = ctx.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title="Data Sources"
        description="Connect databases, warehouses and files."
        actions={canEdit ? <NewSourceDialog workspaceId={ctx.workspace.id} /> : undefined}
      />

      {sources.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No data sources connected"
          description="Connect your first database, warehouse or spreadsheet to start analyzing your data."
          action={canEdit ? <NewSourceDialog workspaceId={ctx.workspace.id} /> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => {
            const def = CONNECTOR_CATALOG.find((c) => c.type === s.type);
            return (
              <Link key={s.id} href={`/data-sources/${s.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{def?.name ?? s.type}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge
                          variant={
                            s.status === "CONNECTED" ? "success" : s.status === "ERROR" ? "destructive" : "secondary"
                          }
                        >
                          {s.status}
                        </Badge>
                        {canEdit && (
                          <ObjectMenu
                            openHref={`/data-sources/${s.id}`}
                            deleteEndpoint={`/api/data-sources/${s.id}?workspaceId=${ctx.workspace.id}`}
                            deleteConfirm={`Delete data source "${s.name}"? Catalog metadata will be removed.`}
                          />
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {s.last_sync_at ? `Last synchronized ${relativeTime(s.last_sync_at)}` : "Never synchronized"}
                    </p>
                    {s.last_error && (
                      <p className="mt-1 truncate text-xs text-destructive">{s.last_error}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
