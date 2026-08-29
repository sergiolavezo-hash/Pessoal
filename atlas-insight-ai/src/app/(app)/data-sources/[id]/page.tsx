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
import { RefreshButton } from "@/features/data-sources/refresh-button";
import {
  DATASET_STATUS_LABEL,
  DATASET_STATUS_VARIANT,
  type DatasetStatus,
} from "@/services/datasets";
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

  const [{ data: datasets }, { data: tables }, { data: revisions }] = await Promise.all([
    supabase.from("datasets").select("*").eq("data_source_id", id).order("name"),
    supabase
      .from("catalog_tables")
      .select("*, datasets!inner(data_source_id, name)")
      .eq("datasets.data_source_id", id)
      .order("name"),
    // Histórico de atualizações. A tabela só existe a partir da 0018; sem ela
    // a consulta falha e a seção simplesmente não aparece.
    supabase
      .from("dataset_revisions")
      .select("revision, status, reason, quality_score, column_count, started_at")
      .eq("data_source_id", id)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const def = CONNECTOR_CATALOG.find((c) => c.type === dataSource.type);
  const canEdit = ctx.role !== "VIEWER";
  const tableList = (tables ?? []) as Array<CatalogTable & { datasets: Pick<Dataset, "name"> }>;

  // O usuário lê o estado dos DADOS. Sem a migração 0018 o campo não existe e
  // caímos no status técnico de conexão.
  const rawStatus = (dataSource as { dataset_status?: string | null }).dataset_status;
  const datasetStatus = rawStatus as DatasetStatus | undefined;
  const statusLabel =
    datasetStatus && datasetStatus in DATASET_STATUS_LABEL
      ? DATASET_STATUS_LABEL[datasetStatus]
      : dataSource.status === "CONNECTED"
        ? "Conectada"
        : dataSource.status === "ERROR"
          ? "Erro"
          : "Pendente";
  const statusVariant =
    datasetStatus && datasetStatus in DATASET_STATUS_VARIANT
      ? DATASET_STATUS_VARIANT[datasetStatus]
      : dataSource.status === "CONNECTED"
        ? ("success" as const)
        : dataSource.status === "ERROR"
          ? ("destructive" as const)
          : ("secondary" as const);
  const qualityScore = (dataSource as { quality_score?: number | null }).quality_score ?? null;
  const history = (revisions ?? []) as Array<{
    revision: number;
    status: string;
    reason: string | null;
    quality_score: number | null;
    column_count: number | null;
    started_at: string;
  }>;

  return (
    <div>
      <PageHeader
        title={dataSource.name}
        description={`${def?.name ?? dataSource.type} · ${
          dataSource.last_sync_at
            ? `Sincronizada ${relativeTime(dataSource.last_sync_at)}`
            : "Nunca sincronizada"
        }`}
        actions={
          <div className="flex items-center gap-2">
            {canEdit && <RefreshButton dataSourceId={id} workspaceId={ctx.workspace.id} />}
            <SourceActions workspaceId={ctx.workspace.id} dataSourceId={id} canEdit={canEdit} />
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <Badge variant={statusVariant}>{statusLabel}</Badge>
        {qualityScore != null && (
          <span className="text-sm text-muted-foreground">
            Qualidade da base: {qualityScore}/100
          </span>
        )}
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

      {history.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Histórico de atualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Qualidade</TableHead>
                  <TableHead>Colunas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((rev) => (
                  <TableRow key={rev.revision}>
                    <TableCell className="text-muted-foreground">
                      {relativeTime(rev.started_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rev.status === "PUBLISHED" ? "success" : "destructive"}>
                        {rev.status === "PUBLISHED" ? "Publicada" : "Recusada"}
                      </Badge>
                      {rev.reason && (
                        <p className="mt-1 text-xs text-muted-foreground">{rev.reason}</p>
                      )}
                    </TableCell>
                    <TableCell>{rev.quality_score != null ? `${rev.quality_score}/100` : "—"}</TableCell>
                    <TableCell>{rev.column_count ?? "—"}</TableCell>
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
