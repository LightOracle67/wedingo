import { describe, it, expect } from "vitest";
import { normalizeConfig } from "../normalize-config";

const FULL_CONFIG = {
  adminUsername: "  USER123  ",
  firstName: "  Juan  ",
  secondName: "  María  ",
  inviteMessage: "  Ven a la boda  ",
  weddingPlace: "  Iglesia San José  ",
  weddingLatitude: "  40.4168  ",
  weddingLongitude: "  -3.7038  ",
  weddingDay: "  15  ",
  weddingMonth: "  junio  ",
  weddingYear: "  2026  ",
  weddingHour: "  18  ",
  weddingMinute: "  30  ",
  weddingSchedule: "  Tarde  ",
  weddingDressCode: "  Formal  ",
  theme: "  forest  ",
  backgroundImage: "  /path/to/img.jpg  ",
  backgroundImageLabel: "  Photo  ",
  backgroundImageSource: "  local  ",
  backgroundImageStorage: "  storage/path  ",
  couplePhoto: "  /path/to/couple.jpg  ",
  couplePhotoStorage: "  couple/storage  ",
  sectionOrder: "  hero,details,story  ",
  hiddenSections: "  gifts  ",
  storyText: "  Our story  ",
  giftsInfo: "  No gifts  ",
  bankInfo: "  ES00 1234  ",
  accommodationInfo: "  Hotel  ",
  transportInfo: "  Bus  ",
  godparent1: "  Ana  ",
  godparent2: "  Luis  ",
  musicUrl: "  https://spotify.com/...  ",
  kidsPolicy: "  Yes  ",
  menuEnabled: "  true  ",
  menuTexto: "  Menu info  ",
  privacyPolicyVersion: "  v1  ",
  menuCarne: "  Beef  ",
  menuPescado: "  Fish  ",
  menuVegano: "  Vegan  ",
  menuPostre: "  Cake  ",
};

describe("normalizeConfig", () => {
  it("trims all string fields", () => {
    const result = normalizeConfig(FULL_CONFIG);
    expect(result.firstName).toBe("Juan");
    expect(result.secondName).toBe("María");
    expect(result.weddingPlace).toBe("Iglesia San José");
  });

  it("lowercases adminUsername", () => {
    const result = normalizeConfig(FULL_CONFIG);
    expect(result.adminUsername).toBe("user123");
  });

  it("falls back to golden theme for invalid theme", () => {
    const result = normalizeConfig({ ...FULL_CONFIG, theme: "  nonexistent  " });
    expect(result.theme).toBe("golden");
  });

  it("falls back to golden theme for null theme", () => {
    const result = normalizeConfig({ ...FULL_CONFIG, theme: null });
    expect(result.theme).toBe("golden");
  });

  it("uses valid theme", () => {
    const result = normalizeConfig(FULL_CONFIG);
    expect(result.theme).toBe("forest");
  });

  it("returns default sectionOrder when not provided", () => {
    const result = normalizeConfig({});
    expect(result.sectionOrder).toBe("hero,details,info,story,gallery,music,gifts,accommodation,rsvp");
  });

  it("normalizes menuEnabled to string boolean", () => {
    expect(normalizeConfig({ menuEnabled: "true" }).menuEnabled).toBe("true");
    expect(normalizeConfig({ menuEnabled: "false" }).menuEnabled).toBe("false");
    expect(normalizeConfig({ menuEnabled: "yes" }).menuEnabled).toBe("false");
    expect(normalizeConfig({}).menuEnabled).toBe("false");
  });

  it("handles null/undefined input", () => {
    const result = normalizeConfig(null);
    expect(result.firstName).toBe("");
    expect(result.theme).toBe("golden");
    expect(result.adminUsername).toBe("");
  });

  it("preserves empty strings", () => {
    const result = normalizeConfig({ firstName: "  " });
    expect(result.firstName).toBe("");
  });
});
