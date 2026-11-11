import type { NextRequest } from "next/server";

/**
 * Endereço público do app, usado em URLs de retorno do Stripe.
 *
 * Preferimos uma variável de ambiente fixa (NEXT_PUBLIC_SITE_URL ou
 * APP_URL) a `request.nextUrl.origin`: a origem da requisição deriva do
 * cabeçalho Host, que um cliente pode forjar para fazer o Stripe devolver o
 * usuário a outro domínio. Sem a variável, cai na origem da requisição
 * (comportamento anterior), então nada quebra em ambientes já configurados.
 */
export function appOrigin(request: NextRequest): string {
  const fixed = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
  if (fixed) {
    try {
      return new URL(fixed).origin;
    } catch {
      // valor inválido: usa a origem da requisição
    }
  }
  return request.nextUrl.origin;
}
