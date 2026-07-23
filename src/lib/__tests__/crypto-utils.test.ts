import { describe, it, expect } from "vitest";
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

  it("returns original text when token is missing", async () => {
    const result = await encrypt("test", "");
    expect(result).toBe("test");
  });
});
