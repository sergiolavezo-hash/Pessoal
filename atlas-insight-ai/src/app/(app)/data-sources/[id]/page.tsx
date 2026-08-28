import { notFound } from "next/navigation";
import { Table2 } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SourceActions } from "@/features/data-sources/source-actions";
import { CONNECTOR_CATALOG } from "@/features/data-sources/connector-catalog";
import type { CatalogTable, DataSource, Dataset } from "@/types";

export const metadata = { title: "Data Source" };

export default async function DataSourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("data_sources")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .is("deleted_at", null)
    .single();
  if (!source) notFound();
  const dataSource = source as DataSource;

  const [{ data: datasets }, { data: tables }] = await Promise.all([
    supabase.from("datasets").select("*").eq("data_source_id", id).order("name"),
    supabase
      .from("catalog_tables")
      .select("*, datasets!inner(data_source_id, name)")
      .eq("datasets.data_source_id", id)
      .order("name"),
  ]);

  const def = CONNECTOR_CATALOG.find((c) => c.type === dataSource.type);
  const canEdit = ctx.role !== "VIEWER";
  const tableList = (tables ?? []) as Array<CatalogTable & { datasets: Pick<Dataset, "name"> }>;

  return (
    <div>
      <PageHeader
        title={dataSource.name}
        description={`${def?.name ?? dataSource.type} · ${
          dataSource.last_sync_at
            ? `Sincronizada ${relativeTime(dataSource.last_sync_at)}`
            : "Nunca sincronizada"
        }`}
        actions={<SourceActions workspaceId={ctx.workspace.id} dataSourceId={id} canEdit={canEdit} />}
      />

      <div className="mb-6 flex items-center gap-3">
        <Badge
          variant={
            dataSource.status === "CONNECTED" ? "success" : dataSource.status === "ERROR" ? "destructive" : "secondary"
          }
        >
          {dataSource.status}
        </Badge>
        {dataSource.last_error && <p className="text-sm text-destructive">{dataSource.last_error}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Tables ({tableList.length}) · Schemas ({(datasets ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tableList.length === 0 ? (
            <EmptyState
              icon={Table2}
              title="No tables discovered yet"
              description='Click "Sync schema" to discover schemas, tables and columns.'
              className="border-0"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Schema</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Rows (approx.)</TableHead>
                  <TableHead>Profiled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableList.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">{t.datasets.name}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.row_count != null ? t.row_count.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      {t.profiled_at ? (
                        <Badge variant="success">Profiled {relativeTime(t.profiled_at)}</Badge>
                      ) : (
                        <Badge variant="secondary">Not profiled</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
