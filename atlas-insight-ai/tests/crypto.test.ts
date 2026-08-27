import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  decryptCredentials,
  decryptSecret,
  encryptCredentials,
  encryptSecret,
} from "@/lib/crypto";

const KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");

describe("crypto AES-256-GCM", () => {
  it("cifra e decifra ida e volta", () => {
    const payload = encryptSecret("senha-super-secreta", KEY);
    expect(payload.ciphertext).not.toContain("senha");
    expect(decryptSecret(payload, KEY)).toBe("senha-super-secreta");
  });

  it("gera IV diferente a cada chamada", () => {
    const a = encryptSecret("x", KEY);
    const b = encryptSecret("x", KEY);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("falha com chave errada", () => {
    const payload = encryptSecret("segredo", KEY);
    expect(() => decryptSecret(payload, OTHER_KEY)).toThrow();
  });

  it("falha se o ciphertext for adulterado (integridade GCM)", () => {
    const payload = encryptSecret("segredo", KEY);
    const tampered = {
      ...payload,
      ciphertext: Buffer.from(
        Buffer.from(payload.ciphertext, "base64").map((b) => b ^ 1)
      ).toString("base64"),
    };
    expect(() => decryptSecret(tampered, KEY)).toThrow();
  });

  it("rejeita chave com tamanho inválido", () => {
    expect(() => encryptSecret("x", Buffer.from("curta").toString("base64"))).toThrow(
      /Chave de criptografia inválida/
    );
  });

  it("serializa credenciais estruturadas", () => {
    const creds = { host: "db.acme.com", user: "readonly", password: "p@ss" };
    const payload = encryptCredentials(creds, KEY, 2);
    expect(payload.keyVersion).toBe(2);
    expect(decryptCredentials(payload, KEY)).toEqual(creds);
  });

  it("suporta unicode e payloads longos", () => {
    const text = "credencial 🔐 çãõ ".repeat(500);
    expect(decryptSecret(encryptSecret(text, KEY), KEY)).toBe(text);
  });
});
