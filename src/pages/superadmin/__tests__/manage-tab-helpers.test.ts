import { describe, it, expect } from "vitest";
import { buildInvitationIcs, diffInvitations } from "../manage-tab-helpers";

describe("buildInvitationIcs", () => {
  it("devuelve null si falta el día (no hay fecha para el calendario)", () => {
    expect(buildInvitationIcs({ token: "AbCdEf1234" })).toBeNull();
  });

  it("construye el VCALENDAR con la fecha y los nombres de la pareja", () => {
    const ics = buildInvitationIcs({
      token: "AbCdEf1234",
      weddingYear: "2030",
      weddingMonth: "junio",
      weddingDay: "15",
      firstName: "Ana",
      secondName: "Luis",
      weddingPlace: "Hacienda, Sevilla",
    });
    expect(ics).toBeTruthy();
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:AbCdEf1234@wedingo");
    expect(ics).toContain("SUMMARY:Ana & Luis — Boda");
    expect(ics).toContain("LOCATION:Hacienda\\, Sevilla");
    // 2030-06-15 12:00 UTC → 20300615T120000Z
    expect(ics).toContain("DTSTART:20300615T120000Z");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("escapa comas y puntos y coma del lugar para no romper el ICS", () => {
    const ics = buildInvitationIcs({
      token: "t",
      weddingYear: "2030",
      weddingMonth: "enero",
      weddingDay: "1",
      weddingPlace: "Calle, 5; Piso",
    });
    expect(ics).toContain("LOCATION:Calle\\, 5\\; Piso");
  });
});

describe("diffInvitations", () => {
  it("devuelve solo las claves que difieren, recortadas a 80 caracteres", () => {
    const a = { theme: "gold", inviteMessage: "Hola", long: "x".repeat(120) };
    const b = { theme: "rose", inviteMessage: "Hola", long: "y".repeat(120) };
    const diff = diffInvitations(a, b);
    expect(diff.map((d) => d.key)).toEqual(["theme", "long"]);
    expect(diff.find((d) => d.key === "long")?.a.length).toBe(80);
  });

  it("devuelve vacío si los documentos son idénticos o ambos vacíos", () => {
    expect(diffInvitations({ a: 1 }, { a: 1 })).toEqual([]);
    expect(diffInvitations(undefined, undefined)).toEqual([]);
  });
});
