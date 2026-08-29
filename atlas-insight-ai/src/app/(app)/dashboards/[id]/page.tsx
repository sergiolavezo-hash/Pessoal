import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { dashboardSpecSchema } from "@/dashboards/spec";
import { statusLabel } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/empty-state";
import { DashboardView } from "@/features/dashboards/dashboard-view";
import { AskPanel } from "@/features/dashboards/ask-panel";
import type { Dashboard } from "@/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dashboards")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .is("deleted_at", null)
    .single();
  if (!data) notFound();
  const dashboard = data as Dashboard;

  const parsed = dashboardSpecSchema.safeParse(dashboard.spec);
  const canEdit = ctx.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title={dashboard.name}
        description={dashboard.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {dashboard.generated_by_ai && (
              <Badge>
                <Sparkles className="h-3 w-3" /> Gerado por IA
              </Badge>
            )}
            <Badge variant={dashboard.status === "PUBLISHED" ? "success" : "secondary"}>
              {statusLabel(dashboard.status)}
            </Badge>
            <Badge variant="outline">v{dashboard.version}</Badge>
          </div>
        }
      />

      {!parsed.success ? (
        <ErrorState
          title="A especificação deste painel está inválida"
          description="O que está salvo não passou na validação e não pode ser desenhado. Gere o painel de novo ou peça um ajuste ao Atlas."
        />
      ) : (
        <>
          <DashboardView
            workspaceId={ctx.workspace.id}
            dashboardId={dashboard.id}
            spec={parsed.data}
            canEdit={canEdit}
          />
          {/* A pergunta vive aqui, junto dos dados já entendidos e dos
              resultados já calculados — é isso que permite responder sem
              gastar cota de novo. */}
          <AskPanel dashboardId={dashboard.id} workspaceId={ctx.workspace.id} />
        </>
      )}
    </div>
  );
}
