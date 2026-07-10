/**
 * crypto-utils.test.js
 * ─────────────────────────────────────────────────────────────
 * Tests para las utilidades de cifrado AES-256-GCM.
 * Cubre: encrypt, decrypt, round-trip, casos límite y errores.
 *
 * Las funciones usan Web Crypto API (disponible en jsdom/vitest).
 *
 * @module crypto-utils.test
 */

import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../crypto-utils";

/** Token de prueba usado en todos los tests. */
const TEST_TOKEN = "UAZYP6HVX45FVKTG4FVLE58LF6RER2MQ";

describe("crypto-utils", () => {
  // ═══════════════════════════════════════════════════════
  // encrypt
  // ═══════════════════════════════════════════════════════

  describe("encrypt", () => {
    it("devuelve el texto original si no hay texto", async () => {
      const result = await encrypt("", TEST_TOKEN);
      expect(result).toBe("");
    });

    it("devuelve el texto original si no hay token", async () => {
      const result = await encrypt("hola", "");
      expect(result).toBe("hola");
    });

    it("devuelve el texto original si el token es null", async () => {
      const result = await encrypt("hola", null);
      expect(result).toBe("hola");
    });

    it("devuelve el texto original si el token es undefined", async () => {
      const result = await encrypt("hola", undefined);
      expect(result).toBe("hola");
    });

    it("cifra un texto simple y devuelve base64", async () => {
      const result = await encrypt("hola mundo", TEST_TOKEN);
      expect(result).not.toBe("hola mundo");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(10);
    });

    it("cifra textos largos correctamente", async () => {
      const longText = "A".repeat(1000);
      const result = await encrypt(longText, TEST_TOKEN);
      expect(result).not.toBe(longText);
      expect(typeof result).toBe("string");
    });

    it("cifra textos con caracteres especiales y emojis", async () => {
      const specialText = "Hola 👋 mundo 🌍 — ¡áéíóú!";
      const result = await encrypt(specialText, TEST_TOKEN);
      expect(result).not.toBe(specialText);
      expect(typeof result).toBe("string");
    });

    it("produce resultados diferentes para el mismo texto (IV aleatorio)", async () => {
      const r1 = await encrypt("mismo texto", TEST_TOKEN);
      const r2 = await encrypt("mismo texto", TEST_TOKEN);
      // Con IV aleatorio, cada cifrado debe ser diferente
      expect(r1).not.toBe(r2);
    });

    it("no lanza excepción en caso de error (fallback silencioso)", async () => {
      const result = await encrypt("texto", "token_corto");
      // Si falla, devuelve el texto original (comportamiento de fallback)
      expect(typeof result).toBe("string");
    });
  });

  // ═══════════════════════════════════════════════════════
  // decrypt
  // ═══════════════════════════════════════════════════════

  describe("decrypt", () => {
    it("devuelve el ciphertext original si no hay ciphertext", async () => {
      const result = await decrypt("", TEST_TOKEN);
      expect(result).toBe("");
    });

    it("devuelve el ciphertext original si no hay token", async () => {
      const result = await decrypt("abc123def456ghi", "");
      expect(result).toBe("abc123def456ghi");
    });

    it("devuelve el ciphertext original si el ciphertext es demasiado corto (<24 chars)", async () => {
      const result = await decrypt("corto", TEST_TOKEN);
      expect(result).toBe("corto");
    });

    it("devuelve el ciphertext si el token es null", async () => {
      const result = await decrypt("abc123def456ghi789", null);
      expect(result).toBe("abc123def456ghi789");
    });

    it("devuelve vacío al descifrar datos cifrados con otra clave", async () => {
      const encrypted = await encrypt("hola", TEST_TOKEN);
      const wrongKey = "A".repeat(32);
      const result = await decrypt(encrypted, wrongKey);
      expect(result).toBe("");
    });

    it("devuelve vacío al descifrar un base64 aleatorio no cifrado", async () => {
      // Base64 válido pero no cifrado con nuestro algoritmo — falla en crypto.subtle.decrypt
      const randomBase64 = "dGVzdG8gZGUgcHJ1ZWJhIHN1ZmljaWVudGVtZW50ZSBsYXJnbyBwYXJhIDI0";
      const result = await decrypt(randomBase64, TEST_TOKEN);
      expect(result).toBe("");
    });
  });

  // ═══════════════════════════════════════════════════════
  // ROUND-TRIP — CIFRAR + DESCIFRAR
  // ═══════════════════════════════════════════════════════

  describe("round-trip encrypt → decrypt", () => {
    it("descifra correctamente un texto simple", async () => {
      const original = "Hola, confírmame la asistencia";
      const encrypted = await encrypt(original, TEST_TOKEN);
      const decrypted = await decrypt(encrypted, TEST_TOKEN);
      expect(decrypted).toBe(original);
    });

    it("descifra correctamente un texto largo", async () => {
      const original = "A".repeat(5000);
      const encrypted = await encrypt(original, TEST_TOKEN);
      const decrypted = await decrypt(encrypted, TEST_TOKEN);
      expect(decrypted).toBe(original);
    });

    it("descifra correctamente caracteres especiales y emojis", async () => {
      const original = "🎉 ¡Bienvenidos a la boda! 🎊\nMenú: vegano 🌱, sin gluten 🍞\nAlergias: frutos secos 🥜";
      const encrypted = await encrypt(original, TEST_TOKEN);
      const decrypted = await decrypt(encrypted, TEST_TOKEN);
      expect(decrypted).toBe(original);
    });

    it("descifra correctamente con token diferente al de cifrado (devuelve vacío)", async () => {
      const original = "texto secreto";
      const encrypted = await encrypt(original, TEST_TOKEN);
      const decrypted = await decrypt(encrypted, "OTRO_TOKEN_DIFERENTE_123456");
      // Con un token diferente, el descifrado falla → devuelve ""
      expect(decrypted).toBe("");
    });

    it("descifra correctamente cadena vacía (no-op)", async () => {
      const encrypted = await encrypt("", TEST_TOKEN);
      const decrypted = await decrypt(encrypted, TEST_TOKEN);
      expect(decrypted).toBe("");
    });

    it("múltiples round-trips consecutivos son consistentes", async () => {
      const messages = ["uno", "dos", "tres", "hola mundo", "adiós"];
      for (const msg of messages) {
        const enc = await encrypt(msg, TEST_TOKEN);
        const dec = await decrypt(enc, TEST_TOKEN);
        expect(dec).toBe(msg);
      }
    });

    it("round-trip con token numérico convertido a string", async () => {
      const tokenStr = "12345678901234567890123456789012";
      const original = "mensaje de prueba";
      const enc = await encrypt(original, tokenStr);
      const dec = await decrypt(enc, tokenStr);
      expect(dec).toBe(original);
    });
  });
});
