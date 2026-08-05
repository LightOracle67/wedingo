import { describe, it, expect } from "vitest";
import { validateConfigForSave } from "../config-validation";
import { STORY_SECTION_ORDER } from "../constants";

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    adminUsername: "admin1",
    firstName: "Ana",
    secondName: "Luis",
    theme: "golden",
    weddingDay: "1",
    weddingMonth: "enero",
    weddingYear: String(new Date().getFullYear() + 1),
    weddingHour: "12",
    weddingMinute: "00",
    sectionOrder: STORY_SECTION_ORDER.join(","),
    hiddenSections: "",
    _privacyConsent: "true",
    ...overrides,
  };
}

describe("validateConfigForSave", () => {
  it("passes a valid first-save config", () => {
    const result = validateConfigForSave(validConfig(), false, 2030);
    expect(result.errorKey).toBeNull();
    expect(result.sanitized.firstName).toBe("Ana");
  });

  it("requires privacy consent on first save", () => {
    const result = validateConfigForSave(validConfig({ _privacyConsent: "" }), false, 2030);
    expect(result.errorKey).toBe("errors.acceptPrivacyPolicy");
  });

  it("requires a username on first save", () => {
    const result = validateConfigForSave(validConfig({ adminUsername: "" }), false, 2030);
    expect(result.errorKey).toBe("errors.usernameRequired");
  });

  it("rejects an invalid username", () => {
    const result = validateConfigForSave(validConfig({ adminUsername: "user name!" }), false, 2030);
    expect(result.errorKey).toBe("errors.usernameInvalid");
  });

  it("rejects an overlong username", () => {
    const result = validateConfigForSave(validConfig({ adminUsername: "u".repeat(60) }), false, 2030);
    expect(result.errorKey).toBe("errors.usernameTooLong");
  });

  it("skips first-save username checks when config already exists", () => {
    const result = validateConfigForSave(validConfig({ adminUsername: "" }), true, 2030);
    expect(result.errorKey).toBeNull();
  });

  it("requires both names", () => {
    const result = validateConfigForSave(validConfig({ firstName: "" }), true, 2030);
    expect(result.errorKey).toBe("errors.bothNamesRequired");
  });

  it("normalizes an invalid theme to the golden default", () => {
    const result = validateConfigForSave(validConfig({ theme: "neon" }), true, 2030);
    expect(result.errorKey).toBeNull();
    expect(result.sanitized.theme).toBe("golden");
  });

  it("completes an incomplete section order", () => {
    const result = validateConfigForSave(validConfig({ sectionOrder: "hero,details,transport" }), true, 2030);
    expect(result.errorKey).toBeNull();
    expect(result.sanitized.sectionOrder.split(",")).toHaveLength(STORY_SECTION_ORDER.length);
  });

  it("rejects an invalid section order", () => {
    const result = validateConfigForSave(validConfig({ sectionOrder: "hero,bogus" }), true, 2030);
    expect(result.errorKey).toBe("errors.sectionOrderInvalid");
  });

  it("requires hero to be the first section", () => {
    const result = validateConfigForSave(validConfig({ sectionOrder: "details," + STORY_SECTION_ORDER.filter((s) => s !== "details").join(",") }), true, 2030);
    expect(result.errorKey).toBe("errors.coverFirst");
  });

  it("requires both godparents or none", () => {
    const result = validateConfigForSave(validConfig({ godparent1: "Padre" }), true, 2030);
    expect(result.errorKey).toBe("errors.godparentsRequired");
  });

  it("requires at least one dish when menu is enabled", () => {
    const result = validateConfigForSave(validConfig({ menuEnabled: "true" }), true, 2030);
    expect(result.errorKey).toBe("errors.menuRequired");
  });

  it("accepts a dish-based menu when menu is enabled", () => {
    const result = validateConfigForSave(
      validConfig({
        menuEnabled: "true",
        menuCarneDishes: JSON.stringify([{ order: "primero", text: "Solomillo" }]),
      }),
      true,
      2030,
    );
    expect(result.errorKey).toBeNull();
  });

  it("rejects a past wedding date", () => {
    const result = validateConfigForSave(validConfig({ weddingYear: "2020" }), true, 2030);
    expect(result.errorKey).toBe("errors.dateBeforeToday");
  });

  it("rejects an invalid accommodation URL", () => {
    const result = validateConfigForSave(validConfig({ accommodationURL: "https://example.com" }), true, 2030);
    expect(result.errorKey).toBe("errors.accommodationUrlInvalid");
  });

  it("derives weddingPlace from a valid maps URL", () => {
    const result = validateConfigForSave(validConfig({ weddingSiteURL: "https://www.google.com/maps/place/Hacienda+Los+Olivos/@37.5,-4.7,17z" }), true, 2030);
    expect(result.errorKey).toBeNull();
    expect(result.sanitized.weddingPlace).toBe("Hacienda Los Olivos");
  });

  it("normalizes a menu dish with an unknown order", () => {
    const result = validateConfigForSave(
      validConfig({ menuEnabled: "true", menuPostre: "Tarta", menuCarne: "Carne", menuCarneDishes: JSON.stringify([{ order: "nope", text: "Plato" }]) }),
      true,
      2030,
    );
    expect(result.errorKey).toBeNull();
    expect(result.sanitized.menuCarneDishes).toContain('"otro"');
  });

  it("rejects a transport departure with an invalid time", () => {
    const result = validateConfigForSave(validConfig({ transportDepartures: JSON.stringify([{ type: "bus", time: "25:00", url: "https://maps.google.com/maps/place/x" }]) }), true, 2030);
    expect(result.errorKey).toBe("errors.transportTimeInvalid");
  });

  it("computes the hidden section set", () => {
    const result = validateConfigForSave(validConfig({ hiddenSections: "gallery,rsvp" }), true, 2030);
    expect(result.errorKey).toBeNull();
    expect(result.hiddenSet.has("gallery")).toBe(true);
    expect(result.hiddenSet.has("rsvp")).toBe(true);
  });

  it("rejects hidden sections with an unknown key", () => {
    const result = validateConfigForSave(validConfig({ hiddenSections: "hero,bogus" }), true, 2030);
    expect(result.errorKey).toBe("errors.hiddenSectionsInvalid");
  });

  it("rejects a section order with the wrong length", () => {
    const order = STORY_SECTION_ORDER.join(",") + ",details";
    const result = validateConfigForSave(validConfig({ sectionOrder: order }), true, 2030);
    expect(result.errorKey).toBe("errors.sectionOrderMismatch");
  });

  it("rejects an overlong invite message", () => {
    const result = validateConfigForSave(validConfig({ inviteMessage: "x".repeat(501) }), true, 2030);
    expect(result.errorKey).toBe("errors.messageTooLong");
  });

  it("rejects an overlong story text", () => {
    const result = validateConfigForSave(validConfig({ storyText: "x".repeat(2001) }), true, 2030);
    expect(result.errorKey).toBe("errors.storyTooLong");
  });

  it("rejects an overlong gifts info", () => {
    const result = validateConfigForSave(validConfig({ giftsInfo: "x".repeat(2001) }), true, 2030);
    expect(result.errorKey).toBe("errors.giftsTooLong");
  });

  it("rejects an invalid IBAN in bankInfo", () => {
    const result = validateConfigForSave(validConfig({ bankInfo: "ES00 1234 INVALID" }), true, 2030);
    expect(result.errorKey).toBe("errors.ibanInvalid");
  });

  it("accepts bankInfo that does not look like an IBAN", () => {
    const result = validateConfigForSave(validConfig({ bankInfo: "Transferencia al contado" }), true, 2030);
    expect(result.errorKey).toBeNull();
  });

  it("rejects schedule events with an invalid time", () => {
    const events = JSON.stringify([{ time: "99:00", text: "Boda" }]);
    const result = validateConfigForSave(validConfig({ weddingScheduleEvents: events }), true, 2030);
    expect(result.errorKey).toBe("errors.scheduleEventTimeInvalid");
  });

  it("rejects a transport departure with an invalid map URL", () => {
    const dep = JSON.stringify([{ type: "bus", time: "12:00", url: "https://example.com" }]);
    const result = validateConfigForSave(validConfig({ transportDepartures: dep }), true, 2030);
    expect(result.errorKey).toBe("errors.transportUrlInvalid");
  });

  it("derives weddingPlace only when the URL contains a place name", () => {
    const result = validateConfigForSave(
      validConfig({ weddingSiteURL: "https://www.google.com/maps/place/@40.4,-3.7,15z", weddingPlace: "Existente" }),
      true,
      2030,
    );
    expect(result.errorKey).toBeNull();
    expect(result.sanitized.weddingPlace).toBe("Existente");
  });

  it("skips the section order check when no order is provided", () => {
    const result = validateConfigForSave(validConfig({ sectionOrder: "" }), true, 2030);
    expect(result.errorKey).toBeNull();
  });

  it("accepts schedule events without a time", () => {
    const events = JSON.stringify([{ time: "", text: "Ceremonia" }]);
    const result = validateConfigForSave(validConfig({ weddingScheduleEvents: events }), true, 2030);
    expect(result.errorKey).toBeNull();
  });

  it("accepts transport departures with valid time and URL", () => {
    const dep = JSON.stringify([{ type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" }]);
    const result = validateConfigForSave(validConfig({ transportDepartures: dep }), true, 2030);
    expect(result.errorKey).toBeNull();
  });

  it("accepts a transport departure without a url", () => {
    const dep = JSON.stringify([{ type: "bus", time: "12:00" }]);
    const result = validateConfigForSave(validConfig({ transportDepartures: dep }), true, 2030);
    expect(result.errorKey).toBeNull();
  });

  it("requires a custom message when the dress code is 'Otro'", () => {
    const result = validateConfigForSave(validConfig({ weddingDressCode: "Otro", weddingDressCodeCustom: "" }), true, 2030);
    expect(result.errorKey).toBe("errors.dressCodeCustomRequired");
  });

  it("accepts the dress code 'Otro' with a custom message", () => {
    const result = validateConfigForSave(validConfig({ weddingDressCode: "Otro", weddingDressCodeCustom: "Vestimenta vintage" }), true, 2030);
    expect(result.errorKey).toBeNull();
    expect(result.sanitized.weddingDressCodeCustom).toBe("Vestimenta vintage");
  });

  it("rejects an overlong custom dress code message", () => {
    const result = validateConfigForSave(validConfig({ weddingDressCode: "Otro", weddingDressCodeCustom: "x".repeat(501) }), true, 2030);
    expect(result.errorKey).toBe("errors.dressCodeCustomTooLong");
  });

  it("discards the custom message when a predefined dress code is chosen", () => {
    const result = validateConfigForSave(validConfig({ weddingDressCode: "Vestimenta formal", weddingDressCodeCustom: "Vestimenta vintage" }), true, 2030);
    expect(result.errorKey).toBeNull();
    expect(result.sanitized.weddingDressCodeCustom).toBe("");
  });
});
