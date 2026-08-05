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
});
