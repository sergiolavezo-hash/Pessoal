import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Analista IA" };

export default function AnalystPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Analista IA</h1>
      <EmptyState
        icon={<MessageSquareText className="h-6 w-6" />}
        title="Seu analista de dados, em breve"
        description="Pergunte em português ('por que a margem caiu em julho?') e receba análise com SQL validado somente leitura, gráficos e recomendações — com todo o raciocínio auditável."
        phase="FASE 6 — Analista IA"
      />
    </div>
  );
}
