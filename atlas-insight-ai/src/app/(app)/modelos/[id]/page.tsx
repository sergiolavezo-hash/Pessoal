import { notFound } from "next/navigation";
import Link from "next/link";
import { Database, Table2 } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EditModelDialog } from "@/features/models/edit-model-dialog";
import {
  TableSemanticsEditor,
  type EditableColumn,
} from "@/features/models/table-semantics-editor";
import { listSelectableTables } from "@/services/analysis-models";
import { requireWorkspace } from "@/services/api-context";

export const metadata = { title: "Modelo" };

/** Papéis do perfilador em linguagem de negócio. */
const ROLE_LABEL: Record<string, string> = {
  MEASURE: "Valor",
  DATE: "Data",
  CATEGORY: "Categoria",
  DIMENSION: "Categoria",
  BOOLEAN: "Sim/Não",
  TEXT: "Texto",
  ID: "Identificador",
  FOREIGN_KEY: "Ligação",
};

/**
 * Detalhe do modelo: o que ele reúne e o que o Atlas entendeu de cada tabela.
 *
 * Esta página absorveu o antigo "Modelo de dados". Ele existia como destino
 * separado no menu, mostrando as tabelas de TODAS as fontes de uma vez — o
 * usuário via uma lista enorme sem saber a qual análise cada tabela pertencia.
 * Aqui a estrutura aparece dentro do modelo que a usa, que é o contexto em
 * que ela significa alguma coisa.
 *
 * Colunas ficam recolhidas por padrão: uma tabela com 40 campos abertos
 * empurra as outras para fora da tela e esconde justamente a visão geral.
 */
/** Converte a linha do catálogo no formato que o editor manipula. */
function editableColumns(
  columns: Array<{
    name: string;
    data_type: string;
    ordinal: number | null;
    classification: { classification?: string } | null;
    display_name: string | null;
    description: string | null;
    role_override: string | null;
    excluded: boolean | null;
  }>
): EditableColumn[] {
  return [...columns]
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .map((c) => ({
      name: c.name,
      dataType: c.data_type,
      displayName: c.display_name,
      description: c.description,
      role: c.classification?.classification ?? null,
      roleOverride: c.role_override,
      excluded: c.excluded ?? false,
    }));
}

export default async function ModeloDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data: model } = await supabase
    .from("analysis_models")
    .select("id, name, description, updated_at")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!model) notFound();

  // As tabelas escolhidas para ESTE modelo — não todas as da fonte.
  const { data: links } = await supabase
    .from("analysis_model_tables")
    .select(
      "table_id, catalog_tables(id, name, row_count, display_name, description, catalog_columns(name, data_type, ordinal, classification, display_name, description, role_override, excluded), datasets(data_sources(id, name)))"
    )
    .eq("model_id", id);

  const tableList = (links ?? [])
    .map((row) => row.catalog_tables as unknown as {
      id: string;
      name: string;
      row_count: number | null;
      display_name: string | null;
      description: string | null;
      catalog_columns: Array<{
        name: string;
        data_type: string;
        ordinal: number | null;
        classification: { classification?: string } | null;
        display_name: string | null;
        description: string | null;
        role_override: string | null;
        excluded: boolean | null;
      }> | null;
      datasets: { data_sources: { id: string; name: string } | null } | null;
    } | null)
    .filter((t): t is NonNullable<typeof t> => t != null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const canEdit = ctx.role !== "VIEWER";
  // Todas as tabelas do workspace, para o diálogo de edição poder oferecer
  // as que ainda não estão no modelo.
  const allTables = canEdit
    ? await listSelectableTables(await requireWorkspace(ctx.workspace.id))
    : [];

  // Origens distintas das tabelas escolhidas, só para dar contexto na tela.
  const sources = [
    ...new Map(
      tableList
        .map((t) => t.datasets?.data_sources)
        .filter((s): s is { id: string; name: string } => s != null)
        .map((s) => [s.id, s])
    ).values(),
  ];

  return (
    <div>
      <PageHeader
        title={model.name as string}
        description={(model.description as string | null) ?? "As tabelas deste modelo e o que o Atlas entendeu de cada uma."}
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <EditModelDialog
                modelId={id}
                workspaceId={ctx.workspace.id}
                currentName={model.name as string}
                currentDescription={(model.description as string | null) ?? null}
                currentTableIds={tableList.map((t) => t.id)}
                tables={allTables}
              />
            )}
            <Link
              href={`/dashboards?model=${id}`}
              className="text-sm text-primary hover:underline"
            >
              Criar painel →
            </Link>
          </div>
        }
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Origens ({sources.length})
      </h2>

      {sources.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Este modelo ainda não tem tabelas"
          description="Edite o modelo e escolha ao menos uma tabela."
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => (
            <Link key={source.id} href={`/data-sources/${source.id}`}>
              <Badge variant="secondary">{source.name}</Badge>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Tabelas neste modelo ({tableList.length})
      </h2>

      {tableList.length === 0 ? (
        <EmptyState
          icon={Table2}
          title="Nenhuma tabela encontrada"
          description="Envie um arquivo ou sincronize a conexão para o Atlas ler a estrutura."
        />
      ) : (
        <div className="space-y-2">
          {tableList.map((table) => {
            const columns = table.catalog_columns ?? [];
            return (
              <details key={table.id} className="rounded-md border">
                <summary className="cursor-pointer list-none px-4 py-3 hover:bg-muted/50">
                  <span className="font-medium">{table.display_name || table.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {table.row_count != null
                      ? `${table.row_count.toLocaleString("pt-BR")} registros · `
                      : ""}
                    {columns.length} campos
                  </span>
                </summary>
                <div className="border-t px-4 py-4">
                  {canEdit ? (
                    <TableSemanticsEditor
                      tableId={table.id}
                      workspaceId={ctx.workspace.id}
                      physicalName={table.name}
                      initialDisplayName={table.display_name}
                      initialDescription={table.description}
                      initialColumns={editableColumns(columns)}
                    />
                  ) : (
                    <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                      {columns.map((col) => {
                        const role = col.role_override ?? col.classification?.classification;
                        return (
                          <li
                            key={col.name}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="truncate">{col.display_name || col.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {role ? (ROLE_LABEL[role] ?? role) : col.data_type}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
