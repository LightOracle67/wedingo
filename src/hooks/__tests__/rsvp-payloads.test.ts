import { describe, it, expect } from "vitest";
import { buildMainGuestData, buildCompanionData } from "../rsvp-payloads";

const form = {
  guestName: "García Pérez López",
  attendance: "with",
  companionCount: 2,
  companionNames: ["Alice María Smith", "Bob Carlos Jones"],
  companionMenus: ["carne", ""],
  companionAllergies: [["sin gluten"], []],
  companionAllergiesOther: ["", "alergia a mariscos"],
  companionBirthDates: ["2000-01-01", "1999-02-02"],
  companionTransportChoices: ["own", "1"],
  companionTransportModes: ["own", "taxi"],
  companionTransportTimes: ["", "14:30"],
  companionTransportPlaces: ["", "Estación Norte"],
  menuSelection: "carne",
  allergiesOther: "intolerancia",
  healthConsent: true,
  birthDate: "1990-01-01",
  transportChoice: "0",
  transportMode: "bus",
  transportTime: "12:00",
  transportPlace: "Plaza Mayor",
};

const now = { seconds: 1, nanoseconds: 2 } as never;

describe("buildMainGuestData", () => {
  it("builds the main guest document with all fields", () => {
    const doc = buildMainGuestData({
      data: form,
      isAttending: true,
      companionCount: 2,
      single: "García Pérez López",
      encryptedDietaryInfo: "enc:sin gluten",
      age: 35,
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.rsvpType).toBe("main");
    expect(doc.attendance).toBe("yes");
    expect(doc.guestName).toBe("García Pérez López");
    expect(doc.companionNames).toEqual(["Alice María Smith", "Bob Carlos Jones"]);
    expect(doc.companionAllergies).toEqual(["sin gluten", ""]);
    expect(doc.companionAllergiesOther).toEqual(["", "alergia a mariscos"]);
    expect(doc.mealChoice).toBe("carne");
    expect(doc.birthDate).toBe("1990-01-01");
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
      age: 35,
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.attendance).toBe("no");
    expect(doc.transportMode).toBeUndefined();
    expect(doc.transportTime).toBeUndefined();
  });

  it("sets parentalConsent for under-14 guests", () => {
    const doc = buildMainGuestData({
      data: { ...form, transportChoice: "", transportMode: "", transportTime: "", transportPlace: "" },
      isAttending: true,
      companionCount: 0,
      single: "Niño Pérez López",
      encryptedDietaryInfo: "",
      age: 10,
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.parentalConsent).toBe(true);
  });

  it("truncates long transport fields", () => {
    const doc = buildMainGuestData({
      data: { ...form, transportTime: "12:00:59", transportPlace: "x".repeat(200) },
      isAttending: true,
      companionCount: 0,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      age: 35,
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.transportTime).toBe("12:00");
    expect((doc.transportPlace as string).length).toBe(120);
  });

  it("falls back to empty arrays when companion optional lists are missing", () => {
    const {
      companionAllergiesOther: _cao,
      companionTransportChoices: _ctc,
      companionTransportModes: _ctm,
      companionTransportTimes: _ctt,
      companionTransportPlaces: _ctp,
      ...rest
    } = form;
    const doc = buildMainGuestData({
      data: rest as typeof form,
      isAttending: true,
      companionCount: 1,
      single: "García Pérez López",
      encryptedDietaryInfo: "",
      age: 35,
      inviteToken: "tok",
      nowTimestamp: now,
    });
    expect(doc.companionAllergiesOther).toEqual([]);
    expect(doc.companionTransportChoices).toEqual([]);
    expect(doc.companionTransportModes).toEqual([]);
    expect(doc.companionTransportTimes).toEqual([]);
    expect(doc.companionTransportPlaces).toEqual([]);
  });
});

describe("buildCompanionData", () => {
  it("builds a companion document linked to the main guest", () => {
    const doc = buildCompanionData({
      data: form,
      i: 1,
      single: "García Pérez López",
      mainGuestId: "main-id",
      encCompDietary: "enc:alergia a mariscos",
      compBirthDate: "1999-02-02",
      compAge: 27,
      nowTimestamp: now,
      inviteToken: "tok",
    });
    expect(doc.rsvpType).toBe("companion");
    expect(doc.guestName).toBe("Bob Carlos Jones");
    expect(doc.attendance).toBe("yes");
    expect(doc.mainGuestDocId).toBe("main-id");
    expect(doc.mainGuestName).toBe("García Pérez López");
    expect(doc.mealChoice).toBeUndefined();
    expect(doc.allergiesOther).toBe("alergia a mariscos");
    expect(doc.transportMode).toBe("taxi");
    expect(doc.transportTime).toBe("14:30");
    expect(doc.transportPlace).toBe("Estación Norte");
    expect(doc.healthConsent).toBe(true);
    expect(doc.birthDate).toBe("1999-02-02");
  });

  it("sets parentalConsent and skips health consent for under-14 companions without allergies", () => {
    const doc = buildCompanionData({
      data: { ...form, companionAllergies: [[], []], companionAllergiesOther: ["", ""] },
      i: 0,
      single: "García Pérez López",
      mainGuestId: "main-id",
      encCompDietary: "",
      compBirthDate: "2015-01-01",
      compAge: 11,
      nowTimestamp: now,
      inviteToken: "tok",
    });
    expect(doc.parentalConsent).toBe(true);
    expect(doc.healthConsent).toBeUndefined();
  });

  it("omits optional companion fields when not provided", () => {
    const doc = buildCompanionData({
      data: {
        ...form,
        companionNames: [""],
        companionMenus: [""],
        companionAllergies: [[]],
        companionAllergiesOther: [""],
        companionBirthDates: [""],
        companionTransportChoices: [""],
        companionTransportModes: [""],
        companionTransportTimes: [""],
        companionTransportPlaces: [""],
      },
      i: 0,
      single: "García Pérez López",
      mainGuestId: "main-id",
      encCompDietary: "",
      compBirthDate: "",
      compAge: null,
      nowTimestamp: now,
      inviteToken: "tok",
    });
    expect(doc.birthDate).toBeUndefined();
    expect(doc.mealChoice).toBeUndefined();
    expect(doc.transportMode).toBeUndefined();
    expect(doc.healthConsent).toBeUndefined();
  });
});
