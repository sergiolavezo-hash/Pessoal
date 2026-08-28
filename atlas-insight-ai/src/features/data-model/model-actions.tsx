"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanSearch, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readJson } from "@/lib/api-client";

export function ModelActions({
  workspaceId,
  dataSourceId,
  canEdit,
}: {
  workspaceId: string;
  dataSourceId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [profiling, setProfiling] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function profile() {
    setProfiling(true);
    try {
      const res = await fetch(`/api/profiling/${dataSourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const json = await readJson<{
        summary?: { columns: number; tables: number; relationships: number };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "Falha ao perfilar os dados");
      const summary = json.summary;
      toast.success(
        summary
          ? `${summary.columns} colunas perfiladas em ${summary.tables} tabela(s) · ${summary.relationships} relacionamento(s) detectado(s)`
          : "Perfilamento concluído"
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profiling failed");
    } finally {
      setProfiling(false);
    }
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/semantic-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, dataSourceId }),
      });
      const json = await readJson<{
        semanticModel?: { version: number };
        entityCount?: number;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "Falha ao gerar o modelo semântico");
      toast.success(
        json.semanticModel
          ? `Modelo semântico v${json.semanticModel.version} gerado (${json.entityCount ?? 0} entidades)`
          : "Modelo semântico gerado"
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={profile} loading={profiling}>
        <ScanSearch />
        Perfilar dados
      </Button>
      <Button size="sm" onClick={generate} loading={generating}>
        <Boxes />
        Generate semantic model
      </Button>
    </div>
  );
}
