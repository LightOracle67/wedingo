import { describe, it, expect } from "vitest";
import { validateRsvpForm } from "../rsvp-validation";

const t = (key: string) => key;

const validForm = {
  guestName: "Ana García",
  attendance: "no",
  companions: 0,
  guestNames: "",
  menuHeadcounts: {},
  dietarySelection: [],
  dietaryOther: "",
  privacyConsent: true,
  healthConsent: true,
  birthDate: "1990-05-15",
  parentalConsent: false,
};

describe("validateRsvpForm", () => {
  it("passes for valid form with attendance no", () => {
    expect(validateRsvpForm(validForm, t, false, false, 0)).toEqual([]);
  });

  it("passes for valid form with attendance yes and companions", () => {
    const form = {
      ...validForm,
      attendance: "yes",
      companions: 2,
      guestNames: "Carlos, María",
    };
    expect(validateRsvpForm(form, t, false, false, 0)).toEqual([]);
  });

  it("rejects empty guestName", () => {
    const form = { ...validForm, guestName: "" };
    expect(validateRsvpForm(form, t, false, false, 0)).toEqual([
      { field: "guestName", message: "rsvp.validation.nameRequired" },
    ]);
  });

  it("rejects whitespace-only guestName", () => {
    const form = { ...validForm, guestName: "   " };
    expect(validateRsvpForm(form, t, false, false, 0)).toEqual([
      { field: "guestName", message: "rsvp.validation.nameRequired" },
    ]);
  });

  it("rejects companions without guestNames", () => {
    const form = {
      ...validForm,
      attendance: "yes",
      companions: 2,
      guestNames: "",
    };
    const errors = validateRsvpForm(form, t, false, false, 0);
    expect(errors).toContainEqual({ field: "guestNames", message: "rsvp.validation.guestNamesRequired" });
  });

  it("rejects guestNames exceeding companions", () => {
    const form = {
      ...validForm,
      attendance: "yes",
      companions: 1,
      guestNames: "Carlos, María",
    };
    const errors = validateRsvpForm(form, t, false, false, 0);
    expect(errors).toContainEqual({ field: "guestNames", message: "rsvp.validation.guestNamesExceed" });
  });

  it("rejects structured menu with zero headcount", () => {
    const form = {
      ...validForm,
      attendance: "yes",
      companions: 2,
      guestNames: "Carlos, María",
      menuHeadcounts: { carne: 0, pescado: 0 },
    };
    const errors = validateRsvpForm(form, t, false, true, 0);
    expect(errors).toContainEqual({ field: "menuHeadcounts", message: "rsvp.validation.menuRequired" });
  });

  it("rejects headcount exceeding companions", () => {
    const form = {
      ...validForm,
      attendance: "yes",
      companions: 2,
      guestNames: "Carlos, María",
      menuHeadcounts: { carne: 3, pescado: 0 },
    };
    const errors = validateRsvpForm(form, t, false, true, 0);
    expect(errors).toContainEqual({ field: "menuHeadcounts", message: "rsvp.validation.headcountExceed" });
  });

  it("rejects missing privacyConsent", () => {
    const form = { ...validForm, privacyConsent: false };
    const errors = validateRsvpForm(form, t, false, false, 0);
    expect(errors).toContainEqual({ field: "privacyConsent", message: "rsvp.validation.privacyRequired" });
  });

  it("rejects missing birthDate", () => {
    const form = { ...validForm, birthDate: "" };
    const errors = validateRsvpForm(form, t, false, false, 0);
    expect(errors).toContainEqual({ field: "birthDate", message: "rsvp.validation.birthDateRequired" });
  });

  it("returns multiple errors at once", () => {
    const form = {
      ...validForm,
      guestName: "",
      privacyConsent: false,
      birthDate: "",
    };
    const errors = validateRsvpForm(form, t, false, false, 0);
    expect(errors).toHaveLength(3);
    expect(errors).toContainEqual({ field: "guestName", message: "rsvp.validation.nameRequired" });
    expect(errors).toContainEqual({ field: "privacyConsent", message: "rsvp.validation.privacyRequired" });
    expect(errors).toContainEqual({ field: "birthDate", message: "rsvp.validation.birthDateRequired" });
  });

  it("skips companion validation when attendance is no", () => {
    const form = {
      ...validForm,
      attendance: "no",
      companions: 2,
      guestNames: "",
    };
    expect(validateRsvpForm(form, t, false, false, 0)).toEqual([]);
  });

  it("skips headcount validation without structured menu", () => {
    const form = {
      ...validForm,
      attendance: "yes",
      companions: 2,
      guestNames: "Carlos, María",
      menuHeadcounts: {},
    };
    expect(validateRsvpForm(form, t, false, false, 0)).toEqual([]);
  });

  it("handles undefined menuHeadcounts gracefully", () => {
    const form = {
      ...validForm,
      attendance: "yes",
      companions: 2,
      guestNames: "Carlos, María",
      menuHeadcounts: undefined as unknown as Record<string, number>,
    };
    const errors = validateRsvpForm(form, t, false, true, 0);
    expect(errors).toContainEqual({ field: "menuHeadcounts", message: "rsvp.validation.menuRequired" });
  });
});
