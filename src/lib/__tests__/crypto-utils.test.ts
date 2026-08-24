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
});
