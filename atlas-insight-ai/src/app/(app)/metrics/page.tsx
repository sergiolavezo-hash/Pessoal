import Link from "next/link";
import { Sigma, BadgeCheck } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ObjectMenu } from "@/components/ui/object-menu";
import { NewMetricDialog } from "@/features/metrics/new-metric-dialog";
import type { Metric, MetricStatus } from "@/types";

export const metadata = { title: "Metrics" };

const STATUS_VARIANT: Record<MetricStatus, "secondary" | "success" | "default" | "destructive"> = {
  DRAFT: "secondary",
  VALIDATED: "default",
  ACTIVE: "success",
  DEPRECATED: "destructive",
};

export default async function MetricsPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("metrics")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .is("deleted_at", null)
    .order("created_at");

  const metrics = (data ?? []) as Metric[];
  const canEdit = ctx.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title="Metrics"
        description="Governed, reusable calculations. Certified metrics are preferred by the AI."
        actions={canEdit ? <NewMetricDialog workspaceId={ctx.workspace.id} /> : undefined}
      />

      {metrics.length === 0 ? (
        <EmptyState
          icon={Sigma}
          title="No metrics defined"
          description="Create metrics like Revenue, Gross Margin or Average Ticket to give the AI a governed vocabulary."
          action={canEdit ? <NewMetricDialog workspaceId={ctx.workspace.id} /> : undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Formula</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link href={`/metrics/${m.id}`} className="flex items-center gap-1.5 font-medium hover:underline">
                        {m.name}
                        {m.certified && <BadgeCheck className="h-4 w-4 text-success" />}
                      </Link>
                      {m.description && (
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.formula}</TableCell>
                    <TableCell className="text-muted-foreground">{m.format}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">v{m.version}</TableCell>
                    <TableCell>
                      {canEdit && (
                        <ObjectMenu
                          openHref={`/metrics/${m.id}`}
                          deleteEndpoint={`/api/metrics/${m.id}?workspaceId=${ctx.workspace.id}`}
                          deleteConfirm={`Delete metric "${m.name}"?`}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
