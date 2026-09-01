import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertStoreAdmin } from "@/store/admin";
import { STORE_BUCKET } from "@/store/entitlements";

/**
 * Permissão temporária para subir o .pbix direto para o bucket privado.
 *
 * Mesmo motivo do upload de dados: a função da Vercel recusa corpo acima de
 * ~4,5 MB NA BORDA, antes do código rodar — e um .pbix com imagens e temas
 * passa disso com folga. Aqui trafega só o nome e o tamanho.
 *
 * O caminho é escolhido pelo SERVIDOR, sempre sob o id do estilo. Deixar o
 * cliente escolher permitiria sobrescrever o arquivo de outro produto.
 */
const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  styleId: z.string().uuid(),
  fileName: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
});

/** Teto do bucket (migração 0025). Recusar aqui evita subir 500 MB à toa. */
const MAX_ASSET_BYTES = 500 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ctx = await requireWorkspace(body?.workspaceId ?? null);
    assertStoreAdmin(ctx);
    const input = bodySchema.parse(body);

    if (!input.fileName.toLowerCase().endsWith(".pbix")) {
      throw new ApiError(400, "O arquivo do modelo precisa ser um .pbix.");
    }
    if (input.sizeBytes > MAX_ASSET_BYTES) {
      throw new ApiError(400, `O arquivo tem ${(input.sizeBytes / 1048576).toFixed(0)} MB e o limite é 500 MB.`);
    }

    const admin = createAdminClient();
    const { data: style } = await admin
      .from("store_product_styles")
      .select("id, product_id")
      .eq("id", input.styleId)
      .maybeSingle();
    if (!style) throw new ApiError(404, "Estilo não encontrado.");

    // Nome novo a cada envio: substituir no mesmo caminho deixaria quem está
    // baixando com uma URL assinada apontando para outro conteúdo no meio do
    // download.
    const path = `${style.product_id}/${style.id}/${randomUUID()}.pbix`;
    const { data, error } = await admin.storage.from(STORE_BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new ApiError(502, error?.message ?? "Não foi possível preparar o envio.");

    return NextResponse.json({ bucket: STORE_BUCKET, path: data.path, token: data.token });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Confirma o envio e sobe a revisão.
 *
 * A revisão é INTERNA: o cliente vê "Executive Sales Dashboard", nunca "V5".
 * Ela existe para dizer a quem já comprou que há versão nova, e para poder
 * voltar atrás se a nova sair pior.
 */
const confirmSchema = z.object({
  workspaceId: z.string().uuid(),
  styleId: z.string().uuid(),
  path: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const ctx = await requireWorkspace(body?.workspaceId ?? null);
    assertStoreAdmin(ctx);
    const input = confirmSchema.parse(body);

    const admin = createAdminClient();

    // O caminho volta pela mão do navegador: confere que ele pertence a ESTE
    // estilo antes de gravar, senão um caminho trocado apontaria o produto
    // para o arquivo de outro.
    if (!input.path.includes(`/${input.styleId}/`)) {
      throw new ApiError(400, "Envio inválido. Refaça o upload do arquivo.");
    }

    const { data: current } = await admin
      .from("store_product_styles").select("revision, asset_path").eq("id", input.styleId).maybeSingle();
    if (!current) throw new ApiError(404, "Estilo não encontrado.");

    // O objeto existe mesmo? Gravar o caminho de um upload que falhou deixaria
    // o produto publicável e o download quebrado.
    const { data: info, error: infoError } = await admin.storage.from(STORE_BUCKET).info(input.path);
    if (infoError || typeof info?.size !== "number") {
      throw new ApiError(400, "Arquivo não encontrado no armazenamento. Refaça o upload.");
    }

    const nextRevision = (current.revision as number) + (current.asset_path ? 1 : 0);
    const { data, error } = await admin
      .from("store_product_styles")
      .update({
        asset_path: input.path,
        asset_bytes: info.size,
        revision: nextRevision,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.styleId)
      .select()
      .single();
    if (error) throw new ApiError(500, error.message);

    // O arquivo antigo sai do bucket só depois que o novo está gravado: se a
    // ordem se inverter e a gravação falhar, o produto fica sem arquivo nenhum.
    if (current.asset_path && current.asset_path !== input.path) {
      await admin.storage.from(STORE_BUCKET).remove([current.asset_path as string]);
    }

    return NextResponse.json({ style: data, revision: nextRevision });
  } catch (error) {
    return handleApiError(error);
  }
}
