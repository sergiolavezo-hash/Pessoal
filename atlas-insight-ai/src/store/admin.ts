import "server-only";
import { ApiError, type ApiContext } from "@/services/api-context";
import { createClient } from "@/lib/supabase/server";

/**
 * Quem pode administrar a loja.
 *
 * A loja é a Atlas vendendo para seus clientes — não é o cliente gerindo a
 * conta dele. Por isso o papel OWNER da organização NÃO vale aqui: usá-lo
 * daria a todo cliente o poder de editar preço, publicar produto e baixar
 * qualquer .pbix do catálogo.
 *
 * A lista vive em variável de ambiente, e não numa coluna do banco, por dois
 * motivos: não exige migração para um papel que tem pouquíssimos ocupantes, e
 * uma escrita indevida no banco não consegue conceder o papel a ninguém.
 *
 * Lista vazia = loja sem administração. É o padrão seguro: numa instalação
 * que esqueceu de configurar, ninguém entra por engano.
 */
export function storeAdminEmails(): string[] {
  // Lido direto de process.env, e não pelo serverEnv() cacheado: é uma lista
  // operacional sem nada a validar, e passar pelo cache faria a função mentir
  // sobre o valor corrente — inclusive em teste, onde o cache da primeira
  // chamada congelaria todas as seguintes.
  const raw = process.env.STORE_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export function isStoreAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = storeAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}

/** Nas rotas de API: barra quem não administra a loja. */
export function assertStoreAdmin(ctx: ApiContext): void {
  if (isStoreAdminEmail(ctx.user.email)) return;
  // 404, não 403: quem não administra não precisa saber que a área existe.
  throw new ApiError(404, "Não encontrado.");
}

/** Nas páginas (Server Components), que não têm ApiContext. */
export async function currentUserIsStoreAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isStoreAdminEmail(user?.email);
}
