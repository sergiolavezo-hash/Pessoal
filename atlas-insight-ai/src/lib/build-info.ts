/**
 * Qual versao do codigo esta rodando.
 *
 * Sem isto, "o que esta no ar?" nao tem resposta de dentro do produto. Um
 * deploy que ainda nao terminou e um defeito de verdade produzem exatamente o
 * mesmo sintoma na tela, e a unica saida vira adivinhar — foi o que aconteceu
 * ao caçar um erro 413 que ja estava corrigido no codigo.
 *
 * A Vercel expoe o commit do build em VERCEL_GIT_COMMIT_SHA. Fora dela (ou em
 * desenvolvimento) nao ha o que mostrar, e a marca simplesmente nao aparece.
 * O identificador so e exibido para quem ja esta autenticado.
 */
export function buildRef(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!sha) return null;
  return sha.slice(0, 7);
}
