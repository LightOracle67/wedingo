/**
 * Tests puros del consentimiento de salud en RSVP (sin montar hooks):
 * cubre principal, acompañantes y la salida temprana por "no asiste".
 */
import { describe, it, expect } from "vitest";
import { missingHealthConsent } from "../rsvp-utils";

const base = {
  attendance: "alone",
  companionCount: 0,
  companionAllergies: [] as Array<string[] | undefined>,
  companionHealthConsents: [] as boolean[],
};

describe("missingHealthConsent", () => {
  it("exige consentimiento del principal cuando marca alergias", () => {
    expect(missingHealthConsent({ ...base, allergies: ["sin gluten"] })).toBe(true);
    expect(missingHealthConsent({ ...base, allergies: ["sin gluten"], healthConsent: true })).toBe(false);
  });

  it("cuenta también el texto libre de alergias del principal", () => {
    expect(missingHealthConsent({ ...base, allergiesOther: "Kiwi" })).toBe(true);
    expect(missingHealthConsent({ ...base, allergiesOther: "   " })).toBe(false);
  });

  it("exige consentimiento por acompañante con alergias o texto libre", () => {
    const d = {
      ...base,
      attendance: "with",
      companionCount: 2,
      companionAllergies: [["sin lactosa"], undefined],
      companionAllergiesOther: ["", "Sésamo"],
      companionHealthConsents: [true, false],
    };
    expect(missingHealthConsent(d)).toBe(true);
    expect(missingHealthConsent({ ...d, companionHealthConsents: [true, true] })).toBe(false);
  });

  it("no pide nada si el invitado no asiste", () => {
    expect(
      missingHealthConsent({
        ...base,
        attendance: "no",
        allergies: ["sin gluten"],
        companionCount: 1,
        companionAllergies: [["x"]],
        companionHealthConsents: [false],
      }),
    ).toBe(false);
  });
});
