/**
 * safe-date.test.ts — Helpers unificados de fechas (v2.191): todas las ramas
 * de firestoreMillis (Timestamp con nanosegundos, toMillis, toDate, Date,
 * ISO, epoch, inválidos), firestoreIso y formatDateLocalized (es/en y
 * entradas inválidas).
 */
import { describe, it, expect } from "vitest";
import { firestoreMillis, firestoreIso, formatDateLocalized } from "../safe-date";

describe("firestoreMillis", () => {
  it("Timestamp de Firestore con segundos + nanosegundos exactos", () => {
    // 2026-01-15T10:00:00.250Z
    const ts = { seconds: 1768456800, nanoseconds: 250_000_000 };
    expect(firestoreMillis(ts)).toBe(1768456800250);
  });

  it("Timestamp con toMillis() propio", () => {
    expect(firestoreMillis({ toMillis: () => 1234 })).toBe(1234);
  });

  it("Timestamp con toDate()", () => {
    const d = new Date("2026-05-08T09:00:00Z");
    expect(firestoreMillis({ toDate: () => d })).toBe(d.getTime());
  });

  it("objeto getTime (Date ajeno)", () => {
    expect(firestoreMillis({ getTime: () => 500 })).toBe(500);
  });

  it("Date válido e inválido", () => {
    expect(firestoreMillis(new Date("2026-01-01T00:00:00Z"))).toBe(1767225600000);
    expect(firestoreMillis(new Date("nope"))).toBeNull();
  });

  it("número epoch válido y NaN", () => {
    expect(firestoreMillis(1000)).toBe(1000);
    expect(firestoreMillis(NaN)).toBeNull();
    expect(firestoreMillis(Infinity)).toBeNull();
  });

  it("string ISO válido, vacío e inválido", () => {
    expect(firestoreMillis("2026-01-01T00:00:00Z")).toBe(1767225600000);
    expect(firestoreMillis("")).toBeNull();
    expect(firestoreMillis("not-a-date")).toBeNull();
  });

  it("null/undefined y objetos sin forma de fecha", () => {
    expect(firestoreMillis(null)).toBeNull();
    expect(firestoreMillis(undefined)).toBeNull();
    expect(firestoreMillis({ seconds: "nope" })).toBeNull();
    expect(firestoreMillis({ foo: 1 })).toBeNull();
  });
});

describe("firestoreIso", () => {
  it("convierte Timestamp a ISO y devuelve '' para inválidos", () => {
    expect(firestoreIso({ seconds: 1768456800, nanoseconds: 0 })).toBe(
      new Date(1768456800000).toISOString(),
    );
    expect(firestoreIso("bad")).toBe("");
    expect(firestoreIso(null)).toBe("");
  });
});

describe("formatDateLocalized", () => {
  it("formatea en es-ES y en-US (locale pinneado)", () => {
    const raw = "2026-08-01T10:00:00";
    expect(formatDateLocalized(raw, "es")).toBe("1/8/2026");
    expect(formatDateLocalized(raw, "en")).toBe("8/1/2026");
    expect(formatDateLocalized(raw, "pt")).toBe("1/8/2026"); // no-en → es-ES
  });

  it("acepta 'en-US' con guion", () => {
    expect(formatDateLocalized("2026-08-01", "en-US")).toBe("8/1/2026");
  });

  it("vacío para entradas inválidas o nulas", () => {
    expect(formatDateLocalized(undefined, "es")).toBe("");
    expect(formatDateLocalized(null, "en")).toBe("");
    expect(formatDateLocalized("no-date", "es")).toBe("");
  });
});

describe("ramas finales de safe-date (v2.191)", () => {
  it("objeto con getTime() que devuelve NaN → null", () => {
    expect(firestoreMillis({ getTime: () => NaN })).toBeNull();
  });

  it("Timestamp con toDate() inválida → null y firestoreIso → ''", () => {
    expect(firestoreMillis({ toDate: () => new Date("nope") })).toBeNull();
    expect(firestoreIso({ toDate: () => new Date("nope") })).toBe("");
  });
});
