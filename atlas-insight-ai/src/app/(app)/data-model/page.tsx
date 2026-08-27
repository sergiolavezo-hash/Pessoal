import Link from "next/link";
import { ArrowRight, Network } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelActions } from "@/features/data-model/model-actions";
import { PrepareTableDialog } from "@/features/data-model/prepare-table-dialog";
import { ObjectMenu } from "@/components/ui/object-menu";
import type { CatalogColumn, ColumnClassification } from "@/types";

export const metadata = { title: "Data Model" };

const CLASS_VARIANT: Record<ColumnClassification, "default" | "secondary" | "success" | "warning" | "outline"> = {
  ID: "warning",
  FOREIGN_KEY: "warning",
  MEASURE: "success",
  DIMENSION: "default",
  CATEGORY: "default",
  DATE: "secondary",
  BOOLEAN: "secondary",
  TEXT: "outline",
};

export default async function DataModelPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();
  const ws = ctx.workspace.id;

  const [{ data: sources }, { data: tables }, { data: columns }, { data: relationships }, { data: models }] =
    await Promise.all([
      supabase.from("data_sources").select("id, name, type").eq("workspace_id", ws).is("deleted_at", null),
      supabase.from("catalog_tables").select("id, name, dataset_id, row_count, profiled_at, datasets(name, data_source_id)").eq("workspace_id", ws).order("name"),
      supabase.from("catalog_columns").select("*").eq("workspace_id", ws).order("ordinal"),
      supabase.from("catalog_relationships").select("*").eq("workspace_id", ws).order("confidence", { ascending: false }),
      supabase.from("semantic_models").select("id, name, version, status, created_at").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(5),
    ]);

  const allColumns = (columns ?? []) as CatalogColumn[];
  const columnById = new Map(allColumns.map((c) => [c.id, c]));
  const tableById = new Map((tables ?? []).map((t) => [t.id, t]));
  const canEdit = ctx.role !== "VIEWER";

  if ((tables ?? []).length === 0) {
    return (
      <div>
        <PageHeader title="Data Model" description="Explore tables, columns and detected relationships." />
        <EmptyState
          icon={Network}
          title="No cataloged tables"
          description="Connect a data source and run a schema sync to populate the data model."
          action={
            <Link href="/data-sources" className="text-sm text-primary hover:underline">
              Go to Data Sources <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Data Model"
        description="Tables, columns, classifications and detected relationships."
        actions={
          (sources ?? []).length > 0 ? (
            <ModelActions workspaceId={ws} dataSourceId={(sources ?? [])[0].id} canEdit={canEdit} />
          ) : undefined
        }
      />

      {(models ?? []).length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Semantic models:</span>
          {(models ?? []).map((m) => (
            <span key={m.id} className="inline-flex items-center gap-0.5">
              <Badge variant={m.status === "ACTIVE" ? "success" : "secondary"}>
                {m.name} v{m.version} · {m.status}
              </Badge>
              {canEdit && (
                <ObjectMenu
                  deleteEndpoint={`/api/semantic-models/${m.id}?workspaceId=${ws}`}
                  deleteConfirm={`Delete semantic model "${m.name}" (v${m.version})? Dashboards keep working; AI generation will fall back to the raw schema.`}
                />
              )}
            </span>
          ))}
        </div>
      )}

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Tables ({(tables ?? []).length})</TabsTrigger>
          <TabsTrigger value="relationships">Relationships ({(relationships ?? []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="mt-4 grid gap-4 lg:grid-cols-2">
          {(tables ?? []).map((table) => {
            const tableColumns = allColumns.filter((c) => c.table_id === table.id);
            const dataset = table.datasets as unknown as { name: string; data_source_id: string } | null;
            const sourceType = (sources ?? []).find((s) => s.id === dataset?.data_source_id)?.type;
            return (
              <Card key={table.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="text-muted-foreground">{dataset?.name}.</span>
                      {table.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-normal text-muted-foreground">
                        {table.row_count != null ? `${Number(table.row_count).toLocaleString()} rows` : ""}
                      </span>
                      {canEdit && (
                        <PrepareTableDialog
                          workspaceId={ws}
                          tableId={table.id}
                          tableName={table.name}
                          isFile={sourceType === "file"}
                          columns={tableColumns.map((c) => ({
                            id: c.id,
                            name: c.name,
                            data_type: c.data_type,
                            excluded: Boolean((c as { excluded?: boolean }).excluded),
                            expression: (c as { expression?: string | null }).expression ?? null,
                          }))}
                        />
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {tableColumns.map((c) => {
                      const cls = c.classification?.classification;
                      const confidence = c.classification?.confidence;
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-mono text-xs">{c.name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground">{c.data_type}</span>
                            {cls && (
                              <Badge variant={CLASS_VARIANT[cls] ?? "outline"} title={`confidence ${confidence ?? "?"}`}>
                                {cls}
                                {confidence != null && (
                                  <span className="opacity-70">{Math.round(confidence * 100)}%</span>
                                )}
                              </Badge>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="relationships" className="mt-4">
          {(relationships ?? []).length === 0 ? (
            <EmptyState
              icon={Network}
              title="No relationships detected"
              description='Run "Profile data" to detect primary/foreign key relationships.'
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {(relationships ?? []).map((r) => {
                    const source = columnById.get(r.source_column_id);
                    const target = columnById.get(r.target_column_id);
                    const sourceTable = source ? tableById.get(source.table_id) : null;
                    const targetTable = target ? tableById.get(target.table_id) : null;
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                        <span className="flex items-center gap-2 font-mono text-xs">
                          {sourceTable?.name}.{source?.name}
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          {targetTable?.name}.{target?.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{r.reason}</span>
                          <Badge variant="secondary">{r.relationship_type}</Badge>
                          <Badge variant={Number(r.confidence) > 0.8 ? "success" : "warning"}>
                            {Math.round(Number(r.confidence) * 100)}%
                          </Badge>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
