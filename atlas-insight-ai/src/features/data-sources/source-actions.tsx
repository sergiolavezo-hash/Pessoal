"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlugZap, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readJson } from "@/lib/api-client";

export function SourceActions({
  workspaceId,
  dataSourceId,
  canEdit,
}: {
  workspaceId: string;
  dataSourceId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function test() {
    setTesting(true);
    try {
      const res = await fetch(`/api/data-sources/${dataSourceId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const json = await readJson<{
        result?: { ok?: boolean; latencyMs?: number; message?: string };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "Falha no teste de conexão");
      if (json.result?.ok) toast.success(`Conexão OK (${json.result.latencyMs}ms)`);
      else toast.error(`Falha na conexão: ${json.result?.message ?? "erro desconhecido"}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/data-sources/${dataSourceId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const json = await readJson<{
        summary?: { tables: number; columns: number };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "Falha ao sincronizar");
      toast.success(
        json.summary
          ? `${json.summary.tables} tabela(s) e ${json.summary.columns} coluna(s) descobertas`
          : "Sincronização concluída"
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this data source? Catalog metadata will be removed.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/data-sources/${dataSourceId}?workspaceId=${workspaceId}`, {
        method: "DELETE",
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error);
      toast.success("Data source deleted");
      router.push("/data-sources");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={test} loading={testing}>
        <PlugZap />
        Test connection
      </Button>
      {canEdit && (
        <>
          <Button variant="outline" size="sm" onClick={sync} loading={syncing}>
            <RefreshCw />
            Sync schema
          </Button>
          <Button variant="ghost" size="sm" onClick={remove} loading={deleting} className="text-destructive">
            <Trash2 />
            Delete
          </Button>
        </>
      )}
    </div>
  );
}
