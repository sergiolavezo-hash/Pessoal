"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readJson } from "@/lib/api-client";
import { REFRESH_SCHEDULE_LABEL, type RefreshSchedule } from "@/services/refresh-schedule";

/**
 * Com que frequência esta base se atualiza sozinha.
 *
 * As opções são poucas de propósito: quem usa quer "todo dia", não uma
 * expressão cron. O gatilho é gratuito nos dois caminhos possíveis (Vercel
 * Cron ou pg_cron do Supabase), então nada aqui depende de plano pago.
 */
export function ScheduleSelect({
  dataSourceId,
  workspaceId,
  current,
}: {
  dataSourceId: string;
  workspaceId: string;
  current: RefreshSchedule;
}) {
  const router = useRouter();
  const [value, setValue] = useState<RefreshSchedule>(current);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    const schedule = next as RefreshSchedule;
    const previous = value;
    setValue(schedule);
    setSaving(true);
    try {
      const res = await fetch(`/api/data-sources/${dataSourceId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, schedule }),
      });
      const json = (await readJson(res)) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar");
      toast.success(
        schedule === "manual"
          ? "Esta base só será atualizada quando você pedir."
          : `Atualização automática: ${REFRESH_SCHEDULE_LABEL[schedule].toLowerCase()}.`
      );
      router.refresh();
    } catch (error) {
      // Volta ao valor anterior: um seletor que mostra o que não foi salvo
      // faz o usuário acreditar num agendamento que não existe.
      setValue(previous);
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={value} onValueChange={change} disabled={saving}>
      <SelectTrigger className="w-56" aria-label="Frequência de atualização">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(REFRESH_SCHEDULE_LABEL) as RefreshSchedule[]).map((key) => (
          <SelectItem key={key} value={key}>
            {REFRESH_SCHEDULE_LABEL[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
