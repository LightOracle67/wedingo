import { describe, it, expect } from "vitest";
import { buildMainGuestData, buildCompanionData } from "../rsvp-payloads";

// Formulario base según el nuevo modelo: sin fechas de nacimiento; el flag
// de niño viaja en companionIsChildren ("yes" | "no") y su consentimiento
// parental asociado en companionParentalConsents.
const form = {
  guestName: "García Pérez López",
  attendance: "with",
  companionCount: 2,
  companionNames: ["Alice María Smith", "Bob Carlos Jones"],
  companionMenus: ["carne", ""],
  companionAllergies: [["sin gluten"], ["alergia a mariscos"]],
  companionAllergiesOther: ["", ""],
  companionIsChildren: ["no", "yes"],
  companionParentalConsents: [false, true],
  companionHealthConsents: [true, false],
  menuSelection: "carne",
  allergies: ["sin gluten"],
  allergiesOther: "intolerancia",
  transportChoice: "0",
  transportMode: "bus",
  transportTime: "12:00",
  transportPlace: "Plaza Mayor",
  companionTransportModes: ["own", "taxi"],
  companionTransportChoices: ["", "1"],
  companionTransportTimes: ["", "14:30"],
  companionTransportPlaces: ["", "Estación Norte"],
};

const now = { seconds: 1, nanoseconds: 2 } as never;

describe("buildMainGuestData", () => {
  it("builds the main guest document with all fields (sin birthDate)", () => {
    const doc = buildMainGuestData({
      data: form,
      isAttending: true,
      companionCount: 2,
      single: "García Pérez López",
      encryptedDietaryInfo: "enc:sin gluten",
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.rsvpType).toBe("main");
    expect(doc.attendance).toBe("yes");
    expect(doc.guestName).toBe("García Pérez López");
    expect(doc.companionNames).toEqual(["Alice María Smith", "Bob Carlos Jones"]);
    expect(doc.companionAllergies).toEqual(["sin gluten", "alergia a mariscos"]);
    expect(doc.companionAllergiesOther).toEqual(["", ""]);
    expect(doc.mealChoice).toBe("carne");
    // GDPR: nunca se persisten fechas de nacimiento ni edades.
    expect(doc.birthDate).toBeUndefined();
    expect(doc.childrenNames).toBeUndefined();
    expect(doc.healthConsent).toBe(true);
    expect(doc.transportMode).toBe("bus");
    expect(doc.transportTime).toBe("12:00");
    expect(doc.transportPlace).toBe("Plaza Mayor");
    expect(doc.companionTransportModes).toEqual(["own", "taxi"]);
    expect(doc.companionTransportTimes).toEqual(["", "14:30"]);
    expect(doc.companionTransportPlaces).toEqual(["", "Estación Norte"]);
    expect(doc.dietaryInfo).toBe("enc:sin gluten");
    expect(doc.privacyConsent).toBe(true);
  });

  it("marks attendance as no when not attending", () => {
    const doc = buildMainGuestData({
      data: form,
      isAttending: false,
      companionCount: 0,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.attendance).toBe("no");
    expect(doc.transportMode).toBeUndefined();
    expect(doc.transportTime).toBeUndefined();
  });

  it("truncates long transport fields", () => {
    const doc = buildMainGuestData({
      data: { ...form, transportTime: "12:00:59", transportPlace: "x".repeat(200) },
      isAttending: true,
      companionCount: 0,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.transportTime).toBe("12:00");
    expect((doc.transportPlace as string).length).toBe(120);
  });

  it("falls back to empty arrays when companion optional lists are missing", () => {
    buildMainGuestData({
      data: { ...form, companionNames: [], companionAllergies: [] },
      isAttending: true,
      companionCount: 1,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      inviteToken: "tok",
      nowTimestamp: now,
    });
  });
});

describe("buildCompanionData", () => {
  it("persists isChild=true and parentalConsent for a child companion", () => {
    const doc = buildCompanionData({
      data: form,
      i: 1,
      single: "García Pérez López",
      mainGuestId: "main-id",
      encCompDietary: "enc:alergia a mariscos",
      nowTimestamp: now,
      inviteToken: "tok",
    });
    expect(doc.rsvpType).toBe("companion");
    expect(doc.guestName).toBe("Bob Carlos Jones");
    expect(doc.attendance).toBe("yes");
    expect(doc.mainGuestDocId).toBe("main-id");
    expect(doc.mainGuestName).toBe("García Pérez López");
    // Nuevo modelo: flag booleano + evidencia del consentimiento (art. 7).
    expect(doc.isChild).toBe(true);
    expect(doc.parentalConsent).toBe(true);
    expect(doc.birthDate).toBeUndefined();
    expect(doc.healthConsent).toBe(true);
  });

  it("marks adult companions with isChild=false and no parentalConsent", () => {
    const doc = buildCompanionData({
      data: form,
      i: 0,
      single: "García Pérez López",
      mainGuestId: "main-id",
      encCompDietary: "enc:sin gluten",
      nowTimestamp: now,
      inviteToken: "tok",
    });
    expect(doc.isChild).toBe(false);
    expect(doc.parentalConsent).toBeUndefined();
    expect(doc.healthConsent).toBe(true);
  });

  it("omits parentalConsent when the child checkbox is unchecked", () => {
    const doc = buildCompanionData({
      data: { ...form, companionParentalConsents: [false, false] },
      i: 1,
      single: "García Pérez López",
      mainGuestId: "main-id",
      encCompDietary: "",
      nowTimestamp: now,
      inviteToken: "tok",
    });
    expect(doc.isChild).toBe(true);
    expect(doc.parentalConsent).toBeUndefined();
    // Sin cambio de modelo: la alergia del fixture sigue generando healthConsent.
    expect(doc.healthConsent).toBe(true);
  });
});
