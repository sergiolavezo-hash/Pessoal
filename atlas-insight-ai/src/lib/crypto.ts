import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Criptografia de credenciais de fontes de dados — AES-256-GCM.
 * O ciphertext, IV e auth tag são persistidos em data_source_credentials
 * (tabela sem políticas RLS de cliente: somente service role lê/escreve).
 * A chave NUNCA vai para o banco: vem de ENCRYPTION_KEY no ambiente.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
  keyVersion: number;
}

function decodeKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `Chave de criptografia inválida: esperados ${KEY_BYTES} bytes, recebidos ${key.length}. ` +
        "Gere com: openssl rand -base64 32"
    );
  }
  return key;
}

export function encryptSecret(
  plaintext: string,
  base64Key: string,
  keyVersion = 1
): EncryptedPayload {
  const key = decodeKey(base64Key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion,
  };
}

export function decryptSecret(payload: EncryptedPayload, base64Key: string): string {
  const key = decodeKey(base64Key);
  const decipher = createDecipheriv(ALGO, key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Serializa credenciais estruturadas (objeto) para armazenamento cifrado. */
export function encryptCredentials(
  credentials: Record<string, unknown>,
  base64Key: string,
  keyVersion = 1
): EncryptedPayload {
  return encryptSecret(JSON.stringify(credentials), base64Key, keyVersion);
}

export function decryptCredentials<T = Record<string, unknown>>(
  payload: EncryptedPayload,
  base64Key: string
): T {
  return JSON.parse(decryptSecret(payload, base64Key)) as T;
}
