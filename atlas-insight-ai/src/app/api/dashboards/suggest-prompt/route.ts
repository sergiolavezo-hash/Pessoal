import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError } from "@/services/api-context";
import { AIOrchestrator } from "@/ai/orchestrator";

export const maxDuration = 60;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  dataSourceId: z.string().uuid(),
  /** Contexto de análise (assunto) dentro da fonte; ausente = todos. */
  context: z.string().max(80).optional(),
  modelId: z.string().uuid().optional(),
});

/**
 * Lê o esquema selecionado e devolve um prompt pronto do painel que faz
 * sentido construir com aqueles dados. Alimenta o campo de descrição do
 * diálogo de geração — o usuário só ajusta o texto.
 */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const orchestrator = new AIOrchestrator(ctx);
    const suggestion = await orchestrator.suggestDashboardPrompt(
      body.dataSourceId,
      body.context,
      body.modelId
    );

    return NextResponse.json({ suggestion });
  } catch (error) {
    return handleApiError(error);
  }
}
