/**
 * Tests puros del consentimiento de salud en RSVP (sin montar hooks):
 * desde v2.148.0 el consentimiento es ÚNICO por confirmación — un checkbox
 * cubre a todo el grupo (principal, acompañantes y niños) — así que la
 * validación mira si CUALQUIERA tiene datos de salud y si el checkbox único
 * está marcado. Cubre también la salida temprana por "no asiste".
 */
import { describe, it, expect } from "vitest";
import { missingHealthConsent } from "../rsvp-utils";

const base = {
  attendance: "alone",
  companionCount: 0,
  companionAllergies: [] as Array<string[] | undefined>,
  childrenAllergies: [] as string[],
  childrenAllergiesOther: "",
};

describe("missingHealthConsent", () => {
  it("exige el consentimiento único cuando el principal marca alergias", () => {
    expect(missingHealthConsent({ ...base, allergies: ["sin gluten"] })).toBe(true);
    expect(missingHealthConsent({ ...base, allergies: ["sin gluten"], healthConsent: true })).toBe(false);
  });

  it("cuenta también el texto libre de alergias del principal", () => {
    expect(missingHealthConsent({ ...base, allergiesOther: "Kiwi" })).toBe(true);
    expect(missingHealthConsent({ ...base, allergiesOther: "   " })).toBe(false);
  });

  it("exige UN único consentimiento cuando cualquier acompañante tiene alergias", () => {
    const d = {
      ...base,
      attendance: "with",
      companionCount: 2,
      companionAllergies: [["sin lactosa"], undefined],
      companionAllergiesOther: ["", "Sésamo"],
    };
    expect(missingHealthConsent(d)).toBe(true);
    expect(missingHealthConsent({ ...d, healthConsent: true })).toBe(false);
  });

  it("exige el consentimiento único cuando los niños tienen alergias", () => {
    const d = {
      ...base,
      attendance: "with",
      childrenAllergies: ["sin gluten"],
      childrenAllergiesOther: "frutos secos",
    };
    expect(missingHealthConsent(d)).toBe(true);
    expect(missingHealthConsent({ ...d, healthConsent: true })).toBe(false);
  });

  it("no pide nada si el invitado no asiste", () => {
    expect(
      missingHealthConsent({
        ...base,
        attendance: "no",
        allergies: ["sin gluten"],
        companionCount: 1,
        companionAllergies: [["x"]],
        childrenAllergies: ["y"],
      }),
    ).toBe(false);
  });
});
