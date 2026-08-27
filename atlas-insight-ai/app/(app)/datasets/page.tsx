import { Table2 } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Datasets" };

export default function DatasetsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Datasets</h1>
      <EmptyState
        icon={<Table2 className="h-6 w-6" />}
        title="Nenhum dataset descoberto"
        description="Assim que você conectar uma fonte, o Insight AI descobre tabelas e colunas, calcula perfis (nulos, distintos, min/max) e classifica cada coluna com grau de confiança."
        phase="FASE 3 — Inteligência de dados"
      />
    </div>
  );
}
