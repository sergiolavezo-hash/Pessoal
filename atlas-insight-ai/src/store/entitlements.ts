import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, type ApiContext } from "@/services/api-context";

/**
 * Quem pode baixar o quê.
 *
 * O .pbix é o produto: uma URL que vaze, vaza para sempre. Por isso o arquivo
 * mora num bucket privado sem política de leitura nenhuma — nem o dono da
 * compra consegue lê-lo com o próprio token. Todo download passa por aqui, e
 * o que sai é uma URL assinada de vida curta, emitida DEPOIS de conferir o
 * direito no banco.
 */

export const STORE_BUCKET = "store-assets";

/**
 * Vida da URL assinada.
 *
 * Curta o bastante para um link copiado não virar distribuição, longa o
 * bastante para um download de 300 MB em conexão ruim terminar. O relógio
 * conta a partir da emissão, não do início do download — quem já começou,
 * termina.
 */
const SIGNED_URL_TTL_SECONDS = 10 * 60;

export interface Entitlement {
  id: string;
  productId: string;
  styleId: string;
  purchasedRevision: number;
  assetPath: string | null;
  currentRevision: number;
  productName: string;
  style: string;
}

/**
 * O direito vigente da organização para este estilo, ou null.
 *
 * Consulta pelo cliente do usuário de propósito: a RLS já restringe a
 * organização, então uma falha minha aqui não vira vazamento entre clientes.
 * Defesa em profundidade — o `eq` explícito e a política dizem a mesma coisa.
 */
export async function findEntitlement(
  ctx: ApiContext,
  styleId: string
): Promise<Entitlement | null> {
  const { data, error } = await ctx.supabase
    .from("store_entitlements")
    .select(
      "id, product_id, style_id, purchased_revision, " +
        "store_products!inner(name), store_product_styles!inner(style, asset_path, revision)"
    )
    .eq("organization_id", ctx.organizationId)
    .eq("style_id", styleId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error(`[store] leitura de direito falhou: ${error.message}`);
    return null;
  }
  if (!data) return null;

  // O join do PostgREST não tem tipo gerado neste projeto; a forma é
  // conhecida e conferida uma vez aqui, em vez de espalhar casts.
  const row = data as unknown as {
    id: string;
    product_id: string;
    style_id: string;
    purchased_revision: number;
    store_products: { name: string };
    store_product_styles: { style: string; asset_path: string | null; revision: number };
  };
  const product = row.store_products;
  const style = row.store_product_styles;

  return {
    id: row.id,
    productId: row.product_id,
    styleId: row.style_id,
    purchasedRevision: row.purchased_revision,
    assetPath: style.asset_path,
    currentRevision: style.revision,
    productName: product.name,
    style: style.style,
  };
}

/** Há versão mais nova do que a comprada? O cliente tem direito a ela. */
export function hasUpdate(entitlement: Entitlement): boolean {
  return entitlement.currentRevision > entitlement.purchasedRevision;
}

/**
 * Emite o link de download e registra quem baixou.
 *
 * O registro acontece ANTES de devolver a URL: se gravar depois e a resposta
 * se perder, o download aconteceu e ninguém sabe. Errar para o lado de
 * registrar um download que talvez não termine é barato; o contrário, não.
 */
export async function issueDownload(
  ctx: ApiContext,
  styleId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {}
): Promise<{ url: string; fileName: string; revision: number }> {
  const entitlement = await findEntitlement(ctx, styleId);
  if (!entitlement) {
    // Mesma resposta para "não comprou" e "não existe": distinguir as duas
    // contaria a quem sonda o catálogo o que existe atrás da porta.
    throw new ApiError(404, "Modelo não encontrado na sua conta.");
  }
  if (!entitlement.assetPath) {
    throw new ApiError(409, "Este modelo ainda não tem arquivo publicado. Fale com o suporte.");
  }

  const admin = createAdminClient();

  await admin.from("store_downloads").insert({
    entitlement_id: entitlement.id,
    user_id: ctx.user.id,
    revision: entitlement.currentRevision,
    ip: meta.ip ?? null,
    user_agent: meta.userAgent?.slice(0, 400) ?? null,
  });

  const fileName = `${entitlement.productName} - ${entitlement.style}.pbix`;
  const { data, error } = await admin.storage
    .from(STORE_BUCKET)
    .createSignedUrl(entitlement.assetPath, SIGNED_URL_TTL_SECONDS, { download: fileName });

  if (error || !data?.signedUrl) {
    throw new ApiError(502, `Não foi possível preparar o download: ${error?.message ?? "sem URL"}`);
  }

  return { url: data.signedUrl, fileName, revision: entitlement.currentRevision };
}
