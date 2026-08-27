import { describe, it, expect } from "vitest";
import { sectionHasContent, applyEnabledToggles } from "../section-utils";

describe("sectionHasContent", () => {
  it("always shows hero", () => {
    expect(sectionHasContent("hero", {})).toBe(true);
  });

  it("details has content when the date or URL is set", () => {
    expect(sectionHasContent("details", {})).toBe(false);
    expect(sectionHasContent("details", { weddingDay: "15" })).toBe(true);
    expect(sectionHasContent("details", { weddingSiteURL: "https://maps.google.com" })).toBe(true);
  });

  it("info has content when schedule, dress code or kids policy is set", () => {
    expect(sectionHasContent("info", {})).toBe(false);
    expect(sectionHasContent("info", { weddingDressCode: "Formal" })).toBe(true);
    expect(sectionHasContent("info", { kidsPolicy: "playArea" })).toBe(true);
  });

  it("info has content when only the menu is configured", () => {
    expect(sectionHasContent("info", { menuEnabled: "true" })).toBe(true);
    expect(sectionHasContent("info", { menuCarneDishes: '[{"text":"Plato"}]' })).toBe(true);
    expect(sectionHasContent("info", { menuTextoDishes: '[{"text":"Texto"}]' })).toBe(true);
  });

  it("story and gifts require their text fields", () => {
    expect(sectionHasContent("story", {})).toBe(false);
    expect(sectionHasContent("story", { storyText: "x" })).toBe(true);
    expect(sectionHasContent("gifts", {})).toBe(false);
    expect(sectionHasContent("gifts", { bankInfo: "ES00" })).toBe(true);
  });

  it("accommodation requires a URL", () => {
    expect(sectionHasContent("accommodation", {})).toBe(false);
    expect(sectionHasContent("accommodation", { accommodationURL: "https://maps.google.com" })).toBe(true);
  });

  it("transport has content when enabled or departures exist", () => {
    expect(sectionHasContent("transport", { transportEnabled: "none" })).toBe(false);
    expect(sectionHasContent("transport", { transportEnabled: "bus" })).toBe(true);
    expect(
      sectionHasContent("transport", { transportEnabled: "none", transportDepartures: '[{"time":"12:00"}]' }),
    ).toBe(true);
  });

  it("defaults unknown sections to visible", () => {
    expect(sectionHasContent("hero", {})).toBe(true);
  });

  it("hides the gallery when it has no images and shows it with images", () => {
    // Por defecto (p. ej. en el guardado del admin) la galería es visible.
    expect(sectionHasContent("gallery", {})).toBe(true);
    expect(sectionHasContent("gallery", {}, true)).toBe(true);
    // En la invitación pública, sin imágenes subidas, la sección se oculta.
    expect(sectionHasContent("gallery", {}, false)).toBe(false);
  });
});

describe("applyEnabledToggles", () => {
  it("clears fields whose toggle is disabled", () => {
    const out = applyEnabledToggles({ storyText: "x", storyTextEnabled: "false" });
    expect(out.storyText).toBe("");
    expect(out.storyTextEnabled).toBe("false");
  });

  it("clears both dress code fields when the dress code toggle is off", () => {
    const out = applyEnabledToggles({
      weddingDressCode: "formal",
      weddingDressCodeCustom: "elegante",
      weddingDressCodeEnabled: "false",
    });
    expect(out.weddingDressCode).toBe("");
    expect(out.weddingDressCodeCustom).toBe("");
  });

  it("leaves fields intact when the toggle is on or absent (legacy compatibility)", () => {
    expect(applyEnabledToggles({ storyText: "x", storyTextEnabled: "true" }).storyText).toBe("x");
    expect(applyEnabledToggles({ storyText: "x" }).storyText).toBe("x");
    expect(applyEnabledToggles({ inviteMessage: "hola" }).inviteMessage).toBe("hola");
  });

  it("does not mutate the original object", () => {
    const input = { storyText: "x", storyTextEnabled: "false" };
    const out = applyEnabledToggles(input);
    expect(input.storyText).toBe("x");
    expect(out).not.toBe(input);
  });

  it("maps each toggle to its intended field", () => {
    const out = applyEnabledToggles({
      giftsInfo: "regalo",
      bankInfo: "ES00",
      giftsInfoEnabled: "false",
      instagramUrl: "https://instagram.com/x",
      instagramEnabled: "false",
      kidsPolicy: "ok",
      kidsPolicyEnabled: "false",
      godparent1: "Ana",
      godparent2: "Luis",
      godparentsEnabled: "false",
    });
    expect(out.giftsInfo).toBe("");
    expect(out.bankInfo).toBe("");
    expect(out.instagramUrl).toBe("");
    expect(out.kidsPolicy).toBe("");
    expect(out.godparent1).toBe("");
    expect(out.godparent2).toBe("");
  });
});
