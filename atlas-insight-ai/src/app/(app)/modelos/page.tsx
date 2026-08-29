import Link from "next/link";
import { Boxes, Database } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NewModelDialog, type SelectableDataset } from "@/features/models/new-model-dialog";

export const metadata = { title: "Modelos" };

interface ModelRow {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  analysis_model_datasets: Array<{ model_id: string }> | null;
}

/**
 * Cards, não tabelas: o usuário precisa reconhecer o modelo que ele mesmo
 * nomeou, e ver de relance quantos conjuntos ele reúne. A revisão interna
 * existe no banco e não aparece aqui de propósito — um nome que muda sozinho
 * faz a pessoa procurar o que ela criou.
 */
export default async function ModelosPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  // Vindo do upload: a fonte recém-importada já chega marcada, para o
  // usuário só dar um nome ao modelo em vez de reencontrá-la na lista.
  const { novo } = await searchParams;
  const ctx = await getAppContext();
  const supabase = await createClient();

  const [modelsResult, sourcesResult] = await Promise.all([
    supabase
      .from("analysis_models")
      .select("id, name, description, updated_at, analysis_model_datasets(model_id)")
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "ACTIVE")
      .order("updated_at", { ascending: false }),
    supabase
      .from("data_sources")
      .select("id, name, quality_score, row_count")
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  // Migração 0018 pendente: a tela existe e explica, em vez de estourar.
  const models = (modelsResult.data ?? []) as unknown as ModelRow[];
  const datasets: SelectableDataset[] = (sourcesResult.data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    qualityScore: (row.quality_score as number | null) ?? null,
    rowCount: (row.row_count as number | null) ?? null,
  }));

  const canEdit = ctx.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title="Modelos"
        description="Um modelo reúne os conjuntos de dados que você quer analisar juntos. O mesmo conjunto pode participar de vários modelos, sem duplicar dados."
        actions={
          canEdit ? (
            <NewModelDialog
              workspaceId={ctx.workspace.id}
              datasets={datasets}
              autoOpen={Boolean(novo)}
              preselected={novo ? [novo] : []}
            />
          ) : undefined
        }
      />

      {models.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhum modelo ainda"
          description={
            datasets.length === 0
              ? "Envie seus dados primeiro. Depois você reúne os conjuntos num modelo e faz perguntas sobre eles."
              : 'Crie seu primeiro modelo — por exemplo "Modelo Comercial", reunindo Vendas, Clientes e Produtos.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => {
            const count = model.analysis_model_datasets?.length ?? 0;
            return (
              <Card key={model.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-medium leading-tight">{model.name}</h2>
                    <Badge variant="success">Ativo</Badge>
                  </div>

                  {model.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {model.description}
                    </p>
                  )}

                  <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    {count} {count === 1 ? "conjunto de dados" : "conjuntos de dados"}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Atualizado {relativeTime(model.updated_at)}
                  </p>

                  <Link
                    href={`/modelos/${model.id}`}
                    className="mt-3 inline-block text-sm text-primary hover:underline"
                  >
                    Abrir modelo →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
