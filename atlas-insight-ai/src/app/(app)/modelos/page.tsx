import Link from "next/link";
import { Boxes, Database } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NewModelDialog } from "@/features/models/new-model-dialog";
import { listSelectableTables } from "@/services/analysis-models";
import { requireWorkspace } from "@/services/api-context";

export const metadata = { title: "Modelos" };

interface ModelRow {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  analysis_model_tables: Array<{ model_id: string }> | null;
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
      .select("id, name, description, updated_at, analysis_model_tables(model_id)")
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "ACTIVE")
      .order("updated_at", { ascending: false }),
    listSelectableTables(await requireWorkspace(ctx.workspace.id)),
  ]);

  // Migração 0018 pendente: a tela existe e explica, em vez de estourar.
  const models = (modelsResult.data ?? []) as unknown as ModelRow[];
  const tables = sourcesResult;

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
              tables={tables}
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
            tables.length === 0
              ? "Envie seus dados primeiro. Depois você escolhe quais tabelas entram em cada modelo."
              : 'Crie seu primeiro modelo — por exemplo "Modelo Comercial", escolhendo as tabelas de Vendas, Clientes e Produtos.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => {
            const count = model.analysis_model_tables?.length ?? 0;
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
                    {count} {count === 1 ? "tabela" : "tabelas"}
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
