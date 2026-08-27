import { describe, it, expect } from "vitest";
import { buildMainGuestData, buildCompanionData } from "../rsvp-payloads";

// Formulario base según el nuevo modelo: sin fechas de nacimiento; los niños
// se declaran con un contador (childrenCount) y alergias del grupo.
const form = {
  guestName: "García Pérez López",
  attendance: "with",
  companionCount: 2,
  companionNames: ["Alice María Smith", "Bob Carlos Jones"],
  companionMenus: ["carne", ""],
  companionAllergies: [["sin gluten"], ["alergia a mariscos"]],
  companionAllergiesOther: ["", ""],
  childrenCount: "2",
  childrenAllergies: ["sin gluten"],
  childrenAllergiesOther: "frutos secos",
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

  it("persists children count and group allergies only when declared", () => {
    const doc = buildMainGuestData({
      data: form,
      isAttending: true,
      companionCount: 2,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.childrenCount).toBe(2);
    expect(doc.childrenAllergies).toEqual(["sin gluten"]);
    expect(doc.childrenAllergiesOther).toBe("frutos secos");
  });

  it("omits children fields when no children are declared", () => {
    const doc = buildMainGuestData({
      data: { ...form, childrenCount: "0", childrenAllergies: [], childrenAllergiesOther: "" },
      isAttending: true,
      companionCount: 0,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.childrenCount).toBeUndefined();
    expect(doc.childrenAllergies).toBeUndefined();
  });

  it("caps children allergies list and skips children when not attending", () => {
    const doc = buildMainGuestData({
      data: { ...form, childrenAllergies: Array.from({ length: 12 }, (_, i) => `a${i}`) },
      isAttending: false,
      companionCount: 0,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.childrenCount).toBeUndefined();
    expect(doc.childrenAllergies).toBeUndefined();
    const attending = buildMainGuestData({
      data: { ...form, childrenAllergies: Array.from({ length: 12 }, (_, i) => `a${i}`) },
      isAttending: true,
      companionCount: 0,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect((attending.childrenAllergies as string[]).length).toBe(10);
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
  it("never persists isChild nor parentalConsent (children are counted on the main doc)", () => {
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
    expect(doc.isChild).toBeUndefined();
    expect(doc.parentalConsent).toBeUndefined();
    expect(doc.birthDate).toBeUndefined();
    expect(doc.healthConsent).toBe(true);
  });

  it("marks adult companions with no isChild flag and health consent on allergies", () => {
    const doc = buildCompanionData({
      data: form,
      i: 0,
      single: "García Pérez López",
      mainGuestId: "main-id",
      encCompDietary: "enc:sin gluten",
      nowTimestamp: now,
      inviteToken: "tok",
    });
    expect(doc.isChild).toBeUndefined();
    expect(doc.parentalConsent).toBeUndefined();
    expect(doc.healthConsent).toBe(true);
  });

  it("skips health consent when the companion has no allergies", () => {
    const doc = buildCompanionData({
      data: { ...form, companionAllergies: [], companionAllergiesOther: [] },
      i: 0,
      single: "García Pérez López",
      mainGuestId: "main-id",
      encCompDietary: "",
      nowTimestamp: now,
      inviteToken: "tok",
    });
    expect(doc.healthConsent).toBeUndefined();
  });
});
