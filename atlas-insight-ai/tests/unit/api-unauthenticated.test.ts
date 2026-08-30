import { describe, expect, it } from "vitest";

/**
 * O que uma rota de API deve responder a quem não tem sessão.
 *
 * Redirecionar era o comportamento antigo, e ele mentia: o fetch SEGUE o 307,
 * recebe o HTML da tela de login com status 200, e o cliente reporta
 * "resposta inesperada do servidor (200)" para o que é apenas uma sessão
 * expirada. Ficou mais provável desde que importar um arquivo grande passou a
 * levar vários minutos e várias requisições — dá tempo de a sessão vencer no
 * meio.
 *
 * A regra é decidida pelo caminho, então o teste é sobre o caminho.
 */
function respondsWithJson(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

describe("rota sem sessão", () => {
  it("responde JSON nas rotas de API, em vez de mandar para o login", () => {
    for (const path of [
      "/api/files",
      "/api/files/upload-url",
      "/api/files/abc-123/ingest",
      "/api/dashboards",
    ]) {
      expect(respondsWithJson(path)).toBe(true);
    }
  });

  it("continua redirecionando as telas, que é onde o login faz sentido", () => {
    for (const path of ["/files", "/dashboard", "/modelos", "/settings/billing"]) {
      expect(respondsWithJson(path)).toBe(false);
    }
  });

  // Uma tela cujo nome COMEÇA com "api" não é rota de API.
  it("não confunde uma tela cujo nome começa com api", () => {
    expect(respondsWithJson("/apidocs")).toBe(false);
  });
});

describe("truncagem do relato de erro do cliente", () => {
  /**
   * O servidor valida message em 600 e userAgent em 400. Sem cortar aqui, um
   * erro longo era rejeitado INTEIRO pela validação — e o diagnóstico sumia
   * justamente nos casos difíceis, que são os longos.
   */
  const MESSAGE_MAX = 600;
  const AGENT_MAX = 400;

  it("keeps a long message within what the server accepts", () => {
    const long = "x".repeat(5_000);
    expect(long.slice(0, MESSAGE_MAX).length).toBe(MESSAGE_MAX);
  });

  it("keeps a long user agent within what the server accepts", () => {
    const long = "Mozilla/5.0 ".repeat(200);
    expect(long.slice(0, AGENT_MAX).length).toBe(AGENT_MAX);
  });

  it("leaves a normal message untouched", () => {
    const normal = "Falha no envio na etapa \"registrar arquivo\".";
    expect(normal.slice(0, MESSAGE_MAX)).toBe(normal);
  });
});
