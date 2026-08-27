import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { serverEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for data source credentials at rest.
 * The key is derived from ENCRYPTION_KEY (env). Architecture note: swap this
 * module for a Secrets Manager client without touching callers.
 */

function key(): Buffer {
  const env = serverEnv();
  if (!env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }
  return createHash("sha256").update(env.ENCRYPTION_KEY).digest();
}

export function encryptJson(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptJson<T = unknown>(encoded: string): T {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
