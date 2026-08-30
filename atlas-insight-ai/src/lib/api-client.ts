/**
 * Leitura tolerante de respostas da API.
 *
 * Quando uma função do servidor cai ou estoura o tempo, a plataforma devolve
 * uma página de ERRO EM TEXTO, não JSON. Chamar res.json() direto explode com
 * uma mensagem do navegador que não diz nada ao usuário — foi a origem tanto
 * do "The string did not match the expected pattern" (Safari) quanto do
 * "Unexpected token 'A', \"An error o\"... is not valid JSON" (Chrome).
 */
export type ApiJson = Record<string, unknown> & { error?: string };

export async function readJson<T extends object = ApiJson>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(describeNonJson(res, text));
  }
}

function describeNonJson(res: Response, body: string): string {
  // A Vercel devolve "An error occurred with your deployment" quando a função
  // excede o tempo permitido.
  if (/an error occurred/i.test(body) || res.status === 504 || res.status === 408) {
    return "A operação demorou mais que o tempo permitido e foi interrompida. Tente novamente — se persistir, reduza o escopo (menos dados ou um pedido mais simples).";
  }
  if (res.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
  if (res.status === 413) return "O conteúdo enviado é grande demais.";
  if (res.status >= 500) {
    return `O servidor não conseguiu concluir (erro ${res.status}). Tente novamente em instantes.`;
  }
  return `Resposta inesperada do servidor (${res.status}). Tente novamente.`;
}

/**
 * Faz o pedido e já devolve o JSON, transformando erro de API em Error com a
 * mensagem que o servidor mandou.
 */
export async function postJson<T extends object = ApiJson>(
  url: string,
  body: unknown,
  fallbackMessage = "A operação falhou"
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await readJson<T & { error?: string }>(res);
  if (!res.ok) throw new Error(json.error ?? fallbackMessage);
  return json;
}
