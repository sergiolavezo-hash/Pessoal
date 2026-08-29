import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { FILES_BUCKET, storageKeyFor, uploadRejection } from "@/lib/uploads";

/**
 * Primeira etapa do envio: devolve para o navegador uma permissão temporária
 * de escrita num caminho específico do bucket.
 *
 * O arquivo em si nunca chega aqui — é exatamente esse o ponto. A função da
 * Vercel recusa corpo acima de ~4,5 MB na borda, então planilha de verdade
 * jamais chegaria a ser lida por este processo. O que trafega neste pedido é
 * só o nome e o tamanho.
 *
 * A URL assinada vale por 2 horas e autoriza UM caminho, que quem escolhe é o
 * servidor, sempre debaixo do prefixo do workspace. O navegador não consegue
 * pedir para escrever em outro lugar.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      workspaceId?: unknown;
      name?: unknown;
      size?: unknown;
    } | null;

    if (typeof body?.workspaceId !== "string") throw new ApiError(400, "workspaceId is required");
    if (typeof body.name !== "string" || body.name.trim() === "") {
      throw new ApiError(400, "name is required");
    }

    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    // A recusa por tipo e tamanho acontece ANTES de qualquer byte subir: sem
    // isso o usuário esperaria o upload inteiro de um arquivo que a API vai
    // rejeitar no passo seguinte.
    const rejection = uploadRejection(body.name, Number(body.size));
    if (rejection) throw new ApiError(400, rejection);

    const path = storageKeyFor(ctx.workspaceId, randomUUID(), body.name);
    const { data, error } = await createAdminClient()
      .storage.from(FILES_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new ApiError(502, error?.message ?? "Não foi possível preparar o envio.");
    }

    return NextResponse.json({ bucket: FILES_BUCKET, path: data.path, token: data.token });
  } catch (error) {
    return handleApiError(error);
  }
}
