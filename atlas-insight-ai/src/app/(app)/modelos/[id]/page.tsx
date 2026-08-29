import { notFound } from "next/navigation";
import Link from "next/link";
import { Database, Table2 } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DATASET_STATUS_LABEL, DATASET_STATUS_VARIANT, type DatasetStatus } from "@/services/datasets";

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

  const { data: links } = await supabase
    .from("analysis_model_datasets")
    .select("data_source_id, data_sources(id, name, dataset_status, quality_score, row_count)")
    .eq("model_id", id);

  const sources = (links ?? [])
    .map((row) => row.data_sources as unknown as {
      id: string;
      name: string;
      dataset_status: string | null;
      quality_score: number | null;
      row_count: number | null;
    } | null)
    .filter((s): s is NonNullable<typeof s> => s != null);

  const sourceIds = sources.map((s) => s.id);

  const { data: tables } = sourceIds.length
    ? await supabase
        .from("catalog_tables")
        .select(
          "id, name, row_count, datasets!inner(data_source_id), catalog_columns(name, data_type, classification)"
        )
        .in("datasets.data_source_id", sourceIds)
        .order("name")
    : { data: [] };

  const tableList = (tables ?? []) as unknown as Array<{
    id: string;
    name: string;
    row_count: number | null;
    catalog_columns: Array<{
      name: string;
      data_type: string;
      classification: { classification?: string } | null;
    }> | null;
  }>;

  return (
    <div>
      <PageHeader
        title={model.name as string}
        description={(model.description as string | null) ?? "Os conjuntos de dados deste modelo e o que o Atlas entendeu de cada um."}
        actions={
          <Link
            href={`/dashboards?model=${id}`}
            className="text-sm text-primary hover:underline"
          >
            Criar painel →
          </Link>
        }
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Conjuntos de dados ({sources.length})
      </h2>

      {sources.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Este modelo ainda não tem dados"
          description="Edite o modelo e escolha ao menos um conjunto de dados."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => {
            const status = source.dataset_status as DatasetStatus | null;
            return (
              <Card key={source.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/data-sources/${source.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {source.name}
                    </Link>
                    {status && status in DATASET_STATUS_LABEL && (
                      <Badge variant={DATASET_STATUS_VARIANT[status]}>
                        {DATASET_STATUS_LABEL[status]}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {source.row_count != null
                      ? `${source.row_count.toLocaleString("pt-BR")} registros`
                      : "Contagem não disponível"}
                    {source.quality_score != null && ` · Qualidade ${source.quality_score}/100`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Tabelas ({tableList.length})
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
                  <span className="font-medium">{table.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {table.row_count != null
                      ? `${table.row_count.toLocaleString("pt-BR")} registros · `
                      : ""}
                    {columns.length} campos
                  </span>
                </summary>
                <div className="border-t px-4 py-3">
                  <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    {columns.map((col) => {
                      const role = col.classification?.classification;
                      return (
                        <li key={col.name} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{col.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {role ? (ROLE_LABEL[role] ?? role) : col.data_type}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
