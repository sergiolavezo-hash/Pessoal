import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Dashboards" };

export default function DashboardsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Dashboards</h1>
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title="Nenhum dashboard ainda"
        description="A IA gera o dashboard a partir do seu modelo semântico: KPIs, séries temporais, rankings e narrativa executiva. Cada versão fica salva e auditável."
        phase="FASE 5 — Dashboards"
      />
    </div>
  );
}
