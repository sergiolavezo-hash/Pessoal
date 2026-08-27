import { Database } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Fontes de dados" };

export default function DataSourcesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Fontes de dados</h1>
      <EmptyState
        icon={<Database className="h-6 w-6" />}
        title="Nenhuma fonte conectada"
        description="Conecte BigQuery, PostgreSQL, SQL Server ou envie arquivos CSV/XLSX. As credenciais são cifradas no servidor e todas as consultas rodam em modo somente leitura."
        phase="FASE 2 — Conectores"
      />
    </div>
  );
}
