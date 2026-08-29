import { describe, it, expect } from "vitest";
import { applyRsvpFieldUpdate, RsvpFormDefault, computeNextCounter } from "../rsvp-core";
import { MAX_CHILDREN, MAX_COMPANIONS } from "../../pages/sections/rsvp/constants";

describe("applyRsvpFieldUpdate", () => {
  it("limpia acompañantes y niños cuando la asistencia es 'alone'", () => {
    const base = { ...RsvpFormDefault(), companionCount: 2, companionNames: ["A", "B"], childrenCount: "2" };
    const next = applyRsvpFieldUpdate(base, "attendance", "alone");
    expect(next.companionCount).toBe(0);
    expect(next.companionNames).toEqual([]);
    expect(next.childrenCount).toBe("0");
  });

  it("conserva acompañantes y niños cuando la asistencia es 'with'", () => {
    const base = { ...RsvpFormDefault(), companionCount: 2, companionNames: ["A", "B"], childrenCount: "2" };
    const next = applyRsvpFieldUpdate(base, "attendance", "with");
    expect(next.companionCount).toBe(2);
    expect(next.companionNames).toEqual(["A", "B"]);
    expect(next.childrenCount).toBe("2");
  });

  it("limita companionCount al máximo permitido", () => {
    const base = RsvpFormDefault();
    const next = applyRsvpFieldUpdate(base, "companionCount", String(MAX_COMPANIONS + 5));
    expect(next.companionCount).toBe(MAX_COMPANIONS);
  });

  it("escribe un compañero por índice aplicando el límite de longitud", () => {
    const base = RsvpFormDefault();
    const next = applyRsvpFieldUpdate(base, "companionNames[1]", "x".repeat(140));
    expect(next.companionNames[1]).toBe("x".repeat(120));
  });

  it("limita childrenCount al máximo permitido y normaliza valores no numéricos", () => {
    const base = RsvpFormDefault();
    expect(applyRsvpFieldUpdate(base, "childrenCount", String(MAX_CHILDREN + 5)).childrenCount).toBe(String(MAX_CHILDREN));
    expect(applyRsvpFieldUpdate(base, "childrenCount", "abc").childrenCount).toBe("0");
  });

  it("asigna un campo genérico por clave", () => {
    const base = RsvpFormDefault();
    const next = applyRsvpFieldUpdate(base, "transportMode", "bus");
    expect(next.transportMode).toBe("bus");
  });

  describe("computeNextCounter", () => {
    it("incrementa el total y suma al aforo cuando la respuesta asiste", () => {
      expect(computeNextCounter({ count: 4, attendingCount: 3 }, true)).toEqual({ count: 5, attendingCount: 4 });
    });

    it("incrementa el total sin sumar al aforo cuando el invitado declina", () => {
      expect(computeNextCounter({ count: 4, attendingCount: 3 }, false)).toEqual({ count: 5, attendingCount: 3 });
    });

    it("arranca en 1 cuando no existe contador previo", () => {
      expect(computeNextCounter(undefined, true)).toEqual({ count: 1, attendingCount: 1 });
    });

    it("trata docs legacy sin attendingCount como 0 (no infla el aforo)", () => {
      expect(computeNextCounter({ count: 7 }, true)).toEqual({ count: 8, attendingCount: 1 });
    });
  });
});
