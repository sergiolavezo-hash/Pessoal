import { describe, expect, it } from "vitest";
import { hashFileContent } from "@/services/file-dedup";

function bytes(text: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(text);
  return encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength
  ) as ArrayBuffer;
}

/**
 * Reenviar a mesma planilha refazia parse, perfil, modelo semântico e — quando
 * o layout parecia bagunçado — uma chamada de IA, tudo para chegar ao dataset
 * que já existia. O hash do conteúdo é o que corta esse trabalho inteiro.
 */
describe("hashFileContent", () => {
  it("gives identical content the same fingerprint", () => {
    expect(hashFileContent(bytes("a,b\n1,2\n"))).toBe(hashFileContent(bytes("a,b\n1,2\n")));
  });

  // O nome do arquivo não entra no hash de propósito: o mesmo conteúdo
  // renomeado continua sendo o mesmo dado, e reimportá-lo duplica a base.
  it("gives different content a different fingerprint", () => {
    expect(hashFileContent(bytes("a,b\n1,2\n"))).not.toBe(hashFileContent(bytes("a,b\n1,3\n")));
  });

  // Uma linha a mais é exatamente o caso "planilha atualizada": precisa ser
  // tratada como arquivo novo, não como duplicado.
  it("treats an appended row as new content", () => {
    expect(hashFileContent(bytes("a,b\n1,2\n"))).not.toBe(
      hashFileContent(bytes("a,b\n1,2\n3,4\n"))
    );
  });

  it("produces a hex sha-256", () => {
    expect(hashFileContent(bytes("x"))).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles an empty file without throwing", () => {
    expect(hashFileContent(bytes(""))).toMatch(/^[0-9a-f]{64}$/);
  });
});
