import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson, sha256 } from "@/lib/crypto";

describe("credential encryption", () => {
  it("round-trips JSON payloads", () => {
    const payload = { username: "svc", password: "s3cr3t!", nested: { port: 5432 } };
    const encrypted = encryptJson(payload);
    expect(encrypted).not.toContain("s3cr3t");
    expect(decryptJson(encrypted)).toEqual(payload);
  });

  it("produces a different ciphertext per call (random IV)", () => {
    expect(encryptJson({ a: 1 })).not.toBe(encryptJson({ a: 1 }));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptJson({ a: 1 });
    const tampered = encrypted.slice(0, -4) + "AAAA";
    expect(() => decryptJson(tampered)).toThrow();
  });

  it("hashes deterministically", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
    expect(sha256("abc")).toHaveLength(64);
  });
});
