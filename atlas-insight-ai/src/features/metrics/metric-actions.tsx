"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readJson } from "@/lib/api-client";

export function MetricActions({
  workspaceId,
  metricId,
  slug,
  formula,
  certified,
  canEdit,
  canCertify,
}: {
  workspaceId: string;
  metricId: string;
  slug: string;
  formula: string;
  certified: boolean;
  canEdit: boolean;
  canCertify: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(payload: Record<string, unknown>, action: string, success: string) {
    setBusy(action);
    try {
      const res = await fetch(`/api/metrics/${metricId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...payload }),
      });
      const json = await readJson<{
        validation?: { valid?: boolean; errors?: string[] };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error);
      toast.success(success);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function validate() {
    setBusy("validate");
    try {
      const res = await fetch("/api/metrics/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, formula, slug }),
      });
      const json = await readJson<{
        validation?: { valid?: boolean; errors?: string[] };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "Falha ao validar a fórmula");
      if (json.validation?.valid) {
        toast.success("Fórmula válida");
        await patch({ status: "VALIDATED" }, "validate", "Indicador marcado como validado");
      } else {
        for (const e of json.validation?.errors ?? []) toast.error(e);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this metric?")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/metrics/${metricId}?workspaceId=${workspaceId}`, { method: "DELETE" });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error);
      toast.success("Metric deleted");
      router.push("/metrics");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {canEdit && (
        <Button variant="outline" size="sm" onClick={validate} loading={busy === "validate"}>
          <CheckCircle2 />
          Validate
        </Button>
      )}
      {canCertify && (
        <Button
          variant={certified ? "secondary" : "default"}
          size="sm"
          onClick={() =>
            patch({ certified: !certified }, "certify", certified ? "Certification removed" : "Metric certified")
          }
          loading={busy === "certify"}
        >
          <BadgeCheck />
          {certified ? "Uncertify" : "Certify"}
        </Button>
      )}
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={remove} loading={busy === "delete"} className="text-destructive">
          <Trash2 />
          Delete
        </Button>
      )}
    </div>
  );
}
