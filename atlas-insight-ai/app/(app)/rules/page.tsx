import { BookOpenText } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Regras de negócio" };

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Regras de negócio</h1>
      <EmptyState
        icon={<BookOpenText className="h-6 w-6" />}
        title="Nenhuma regra cadastrada"
        description="Escreva regras em linguagem natural (ex.: 'cliente ativo = compra nos últimos 90 dias') e o Insight AI as estrutura e aplica em toda análise e dashboard."
        phase="FASE 3 — Inteligência de dados"
      />
    </div>
  );
}
