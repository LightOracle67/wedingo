import { describe, it, expect } from "vitest";
import { sectionHasContent } from "../section-utils";

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

  it("extras has no content when no extra is enabled", () => {
    expect(sectionHasContent("extras", {})).toBe(false);
    expect(sectionHasContent("extras", { reactionsEnabled: "false", notesEnabled: "false" })).toBe(false);
  });

  it("extras has content when any of the classic extras is enabled", () => {
    expect(sectionHasContent("extras", { reactionsEnabled: "true" })).toBe(true);
    expect(sectionHasContent("extras", { giftsListEnabled: "true" })).toBe(true);
    expect(sectionHasContent("extras", { musicPollEnabled: "true" })).toBe(true);
    expect(sectionHasContent("extras", { triviaEnabled: "true" })).toBe(true);
  });

  it("extras has content when ONLY the newer extras are enabled (regresión no activable)", () => {
    // Bug corregido: voiceNotes/dayPhotos/mailbox/toasts/venueMap activados en
    // solitario hacían que la sección extras se considerara vacía y se ocultara.
    expect(sectionHasContent("extras", { voiceNotesEnabled: "true" })).toBe(true);
    expect(sectionHasContent("extras", { dayPhotosEnabled: "true" })).toBe(true);
    expect(sectionHasContent("extras", { mailboxEnabled: "true" })).toBe(true);
    expect(sectionHasContent("extras", { toastsEnabled: "true" })).toBe(true);
    expect(sectionHasContent("extras", { venueMapEnabled: "true" })).toBe(true);
    // VenueMap es la clave nueva (upstream), se cubre por cobertura defensiva.
    expect(sectionHasContent("extras", { venueMapEnabled: "true" })).toBe(true);
  });

  it("hides the gallery when it has no images and shows it with images", () => {
    // Por defecto (p. ej. en el guardado del admin) la galería es visible.
    expect(sectionHasContent("gallery", {})).toBe(true);
    expect(sectionHasContent("gallery", {}, true)).toBe(true);
    // En la invitación pública, sin imágenes subidas, la sección se oculta.
    expect(sectionHasContent("gallery", {}, false)).toBe(false);
  });
});
