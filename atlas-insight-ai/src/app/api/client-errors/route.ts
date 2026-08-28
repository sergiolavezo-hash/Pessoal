import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";

/**
 * Falhas que só acontecem no navegador do usuário (versões de Safari,
 * bloqueios do sistema, rede instável) são invisíveis nos registros do
 * servidor. Este canal grava o erro real no histórico de auditoria para que
 * seja possível diagnosticar sem pedir print da tela.
 */
const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  context: z.string().max(60),
  name: z.string().max(120).optional(),
  message: z.string().max(600).optional(),
  stack: z.string().max(1500).optional(),
  userAgent: z.string().max(400).optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId);
    await auditLog(
      ctx,
      "client_error",
      "browser",
      body.context,
      {
        name: body.name,
        message: body.message,
        stack: body.stack,
        user_agent: body.userAgent,
        ...body.extra,
      },
      "failure"
    );
    return NextResponse.json({ recorded: true });
  } catch (error) {
    return handleApiError(error);
  }
}
