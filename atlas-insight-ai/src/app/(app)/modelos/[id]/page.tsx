import { notFound } from "next/navigation";
import Link from "next/link";
import { Database, Table2 } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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

  // As tabelas escolhidas para ESTE modelo — não todas as da fonte.
  const { data: links } = await supabase
    .from("analysis_model_tables")
    .select(
      "table_id, catalog_tables(id, name, row_count, catalog_columns(name, data_type, classification), datasets(data_sources(id, name)))"
    )
    .eq("model_id", id);

  const tableList = (links ?? [])
    .map((row) => row.catalog_tables as unknown as {
      id: string;
      name: string;
      row_count: number | null;
      catalog_columns: Array<{
        name: string;
        data_type: string;
        classification: { classification?: string } | null;
      }> | null;
      datasets: { data_sources: { id: string; name: string } | null } | null;
    } | null)
    .filter((t): t is NonNullable<typeof t> => t != null)
    .sort((a, b) => a.name.localeCompare(b.name));

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
          <Link
            href={`/dashboards?model=${id}`}
            className="text-sm text-primary hover:underline"
          >
            Criar painel →
          </Link>
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
