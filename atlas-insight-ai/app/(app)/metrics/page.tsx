import { Sigma } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Métricas" };

export default function MetricsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Métricas</h1>
      <EmptyState
        icon={<Sigma className="h-6 w-6" />}
        title="Nenhuma métrica definida"
        description="Defina métricas certificadas (receita, churn, ticket médio…) com expressão, dependências e ciclo de vida: rascunho → validada → ativa. A IA sempre usa a definição oficial."
        phase="FASE 3 — Inteligência de dados"
      />
    </div>
  );
}
