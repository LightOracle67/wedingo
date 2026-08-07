import { describe, it, expect, vi } from "vitest";
import { encrypt, decrypt } from "../crypto-utils";

describe("crypto-utils", () => {
  it("encrypts and decrypts a string", async () => {
    const text = "Hello World";
    const token = "test-token-123";
    const encrypted = await encrypt(text, token);
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(text);
    const decrypted = await decrypt(encrypted, token);
    expect(decrypted).toBe(text);
  });

  it("throws when token is missing", async () => {
    await expect(encrypt("test", "")).rejects.toThrow("encrypt: token required");
  });

  it("decrypt returns empty string for wrong token", async () => {
    const text = "Hello World this is a longer text for testing";
    const correctToken = "test-token-123";
    const wrongToken = "wrong-token-456";
    const encrypted = await encrypt(text, correctToken);
    const result = await decrypt(encrypted, wrongToken);
    expect(result).toBe("");
  });

  it("encrypt returns empty string for empty input", async () => {
    const result = await encrypt("", "token");
    expect(result).toBe("");
  });

  it("decrypt returns same string for invalid ciphertext", async () => {
    const result = await decrypt("short", "token");
    expect(result).toBe("short");
  });

  it("encrypt returns empty string when crypto.subtle.encrypt fails", async () => {
    vi.spyOn(crypto.subtle, "encrypt").mockRejectedValueOnce(new Error("encrypt failed"));
    const result = await encrypt("test", "valid-token");
    expect(result).toBe("");
    vi.restoreAllMocks();
  });

  it("decrypts legacy format ciphertext", async () => {
    const token = "test-token-legacy";
    const text = "x";
    const enc = new TextEncoder();
    const salt = enc.encode("wedingo-" + token.slice(0, 16));
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(token.padEnd(32, "x").slice(0, 32)),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 10000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
    const combined = new Uint8Array(12 + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), 12);
    const legacyCiphertext = btoa(String.fromCharCode(...combined));
    const result = await decrypt(legacyCiphertext, token);
    expect(result).toBe(text);
  });
});
