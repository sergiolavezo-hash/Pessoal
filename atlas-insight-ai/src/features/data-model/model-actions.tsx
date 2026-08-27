"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanSearch, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(
        `Profiled ${json.summary.columns} columns in ${json.summary.tables} tables · ${json.summary.relationships} relationships detected`
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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(
        `Semantic model v${json.semanticModel.version} generated (${json.entityCount} entities)`
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
        Profile data
      </Button>
      <Button size="sm" onClick={generate} loading={generating}>
        <Boxes />
        Generate semantic model
      </Button>
    </div>
  );
}
