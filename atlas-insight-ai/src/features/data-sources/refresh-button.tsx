"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readJson } from "@/lib/api-client";

/**
 * "Atualizar agora".
 *
 * O retorno distingue três desfechos, porque para o usuário eles são coisas
 * diferentes: nada mudou, atualizou, ou a versão nova foi recusada e a
 * anterior continua no ar. Um "pronto!" genérico esconderia justamente o caso
 * em que ele precisa agir.
 */
export function RefreshButton({
  dataSourceId,
  workspaceId,
}: {
  dataSourceId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/data-sources/${dataSourceId}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const json = (await readJson(res)) as {
        error?: string;
        changed?: boolean;
        published?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Não foi possível atualizar");

      const message = json.message ?? "Atualização concluída.";
      if (!json.changed) toast.info(message);
      else if (!json.published) toast.warning(message, { duration: 8000 });
      else toast.success(message);

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={refresh} loading={refreshing}>
      <RefreshCw />
      Atualizar agora
    </Button>
  );
}
