import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { systemWorkspaceContext } from "@/services/api-context";
import { refreshDataset } from "@/services/dataset-refresh";
import { nextRefreshAt, isValidSchedule } from "@/services/refresh-schedule";

export const maxDuration = 60;

/**
 * Atualização agendada dos Datasets.
 *
 * Chamado por um gatilho externo — Vercel Cron (1x/dia no Hobby) ou pg_cron
 * do Supabase (qualquer frequência) — ambos gratuitos. O trabalho roda aqui
 * mesmo: não há fila nem worker.
 *
 * O lote é pequeno de propósito. A função morre aos 60s, e uma atualização
 * pode levar dezenas de segundos; tentar esvaziar a fila inteira numa
 * chamada faria a última morrer no meio. Quem não coube fica vencido e entra
 * na chamada seguinte.
 */
const MAX_PER_RUN = 3;

/**
 * O segredo é obrigatório. Sem ele, qualquer pessoa na internet dispararia
 * atualizações de todos os clientes — consumindo cota de IA alheia.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    // 404 em vez de 401: não confirma a existência do endpoint a quem sonda.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: due, error } = await admin
    .from("data_sources")
    .select("id, workspace_id, name, refresh_schedule")
    .not("refresh_schedule", "is", null)
    .neq("refresh_schedule", "manual")
    .lte("next_refresh_at", new Date().toISOString())
    .is("deleted_at", null)
    .order("next_refresh_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    console.error(`[cron] could not list due datasets: ${error.message}`);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const results: Array<{ id: string; name: string; outcome: string }> = [];

  for (const source of due ?? []) {
    const schedule = source.refresh_schedule as string;
    // Reagenda ANTES de trabalhar: se a atualização falhar ou estourar o
    // tempo, este dataset não fica vencido para sempre, disparando a cada
    // chamada do cron e consumindo as vagas dos outros.
    if (isValidSchedule(schedule)) {
      await admin
        .from("data_sources")
        .update({ next_refresh_at: nextRefreshAt(schedule)?.toISOString() ?? null })
        .eq("id", source.id);
    }

    try {
      const ctx = await systemWorkspaceContext(source.workspace_id as string);
      const result = await refreshDataset(ctx, source.id as string);
      results.push({
        id: source.id as string,
        name: source.name as string,
        outcome: !result.changed ? "unchanged" : result.published ? "published" : "rejected",
      });
    } catch (cause) {
      console.error(`[cron] refresh failed for ${source.id}`, cause);
      results.push({
        id: source.id as string,
        name: source.name as string,
        outcome: "error",
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
