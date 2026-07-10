/**
 * token-utils.test.js
 * ─────────────────────────────────────────────────────────────
 * Tests para las utilidades de generación y normalización
 * de tokens (setup tokens e invite tokens).
 *
 * @module token-utils.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSetupToken, normalizeTokenValue, generateInviteToken } from "../token-utils";

describe("token-utils", () => {
  // ═══════════════════════════════════════════════════════
  // generateSetupToken
  // ═══════════════════════════════════════════════════════

  describe("generateSetupToken", () => {
    it("genera un token con formato XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX", () => {
      const token = generateSetupToken();
      expect(token).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){7}$/);
    });

    it("genera un token de 32 caracteres sin contar guiones", () => {
      const token = generateSetupToken();
      const raw = token.replace(/-/g, "");
      expect(raw.length).toBe(32);
    });

    it("solo contiene caracteres del alfabeto permitido (sin I, O, 0, 1)", () => {
      const token = generateSetupToken();
      const raw = token.replace(/-/g, "");
      // El alfabeto es ABCDEFGHJKLMNPQRSTUVWXYZ23456789 — sin I, O, 0, 1
      expect(raw).toMatch(/^[A-HJ-NP-Z2-9]+$/);
    });

    it("genera tokens diferentes en llamadas consecutivas", () => {
      const tokens = new Set();
      for (let i = 0; i < 50; i++) {
        tokens.add(generateSetupToken());
      }
      expect(tokens.size).toBe(50);
    });

    it("genera un string siempre", () => {
      const token = generateSetupToken();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // normalizeTokenValue
  // ═══════════════════════════════════════════════════════

  describe("normalizeTokenValue", () => {
    it("convierte a mayúsculas y elimina caracteres no alfanuméricos", () => {
      const result = normalizeTokenValue("ab-cd  ef!");
      expect(result).toBe("ABCDEF");
    });

    it("elimina espacios en blanco al inicio y final", () => {
      const result = normalizeTokenValue("  ABC123  ");
      expect(result).toBe("ABC123");
    });

    it("elimina guiones y otros separadores", () => {
      const result = normalizeTokenValue("ABCD-EFGH-IJKL");
      expect(result).toBe("ABCDEFGHIJKL");
    });

    it("devuelve vacío para entrada no string", () => {
      expect(normalizeTokenValue(null)).toBe("");
      expect(normalizeTokenValue(undefined)).toBe("");
      expect(normalizeTokenValue(123)).toBe("");
      expect(normalizeTokenValue({})).toBe("");
      expect(normalizeTokenValue([])).toBe("");
    });

    it("devuelve vacío para string vacío", () => {
      expect(normalizeTokenValue("")).toBe("");
    });

    it("devuelve vacío para string solo con caracteres especiales", () => {
      expect(normalizeTokenValue("---!!!")).toBe("");
    });

    it("preserva solo letras (A-Z) y números (0-9)", () => {
      const result = normalizeTokenValue("a1!b2@c3#d4$e5%");
      expect(result).toBe("A1B2C3D4E5");
    });

    it("maneja strings muy largos", () => {
      const long = "a".repeat(1000) + "---" + "b".repeat(1000);
      const result = normalizeTokenValue(long);
      expect(result.length).toBe(2000);
      expect(result).toMatch(/^[AB]+$/);
    });
  });

  // ═══════════════════════════════════════════════════════
  // generateInviteToken
  // ═══════════════════════════════════════════════════════

  describe("generateInviteToken", () => {
    it("genera un token de 10 caracteres alfanuméricos", () => {
      const token = generateInviteToken();
      expect(token).toMatch(/^[A-Za-z0-9]{10}$/);
    });

    it("genera tokens diferentes en llamadas consecutivas", () => {
      const tokens = new Set();
      for (let i = 0; i < 50; i++) {
        tokens.add(generateInviteToken());
      }
      expect(tokens.size).toBe(50);
    });

    it("genera un string siempre", () => {
      const token = generateInviteToken();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(10);
    });

    it("solo contiene caracteres alfanuméricos (sin símbolos)", () => {
      for (let i = 0; i < 20; i++) {
        const token = generateInviteToken();
        expect(token).toMatch(/^[A-Za-z0-9]+$/);
      }
    });
  });
});
