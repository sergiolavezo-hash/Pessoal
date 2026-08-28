import { redirect } from "next/navigation";

/**
 * O link de confirmação do e-mail pode voltar com erro (expirado, já usado,
 * ou apontando para o endereço errado). Nesse caso o usuário caía numa
 * página morta com parâmetros crus na URL. Aqui esse retorno vira o caminho
 * que funciona: a tela de código, com a explicação do que houve.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const errorCode = first(params.error_code) ?? first(params.error);

  if (errorCode) {
    const email = first(params.email);
    const query = new URLSearchParams({ reason: errorCode });
    if (email) query.set("email", email);
    redirect(`/verify-email?${query.toString()}`);
  }

  // Middleware sends authenticated users to /dashboard; everyone else signs in.
  redirect("/login");
}
