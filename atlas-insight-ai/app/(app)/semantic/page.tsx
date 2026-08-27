import { Network } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Modelo semântico" };

export default function SemanticPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Modelo semântico</h1>
      <EmptyState
        icon={<Network className="h-6 w-6" />}
        title="Modelo ainda não construído"
        description="O modelo semântico versiona entidades, relacionamentos detectados (com confiança e justificativa) e vocabulário de negócio — a base que a IA usa para gerar SQL correto."
        phase="FASE 3 — Inteligência de dados"
      />
    </div>
  );
}
