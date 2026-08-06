import { describe, it, expect } from "vitest";
import { normalizeConfig } from "../normalize-config";

const FULL_CONFIG = {
  adminUsername: "  USER123  ",
  firstName: "  Juan  ",
  secondName: "  María  ",
  inviteMessage: "  Ven a la boda  ",
  weddingPlace: "  Iglesia San José  ",
  weddingSiteURL: "  https://www.google.com/maps/place/Iglesia+San+Jos%C3%A9/@40.4,-3.7,15z  ",
  weddingMapView: "  satellite  ",
  weddingMapStatic: "  true  ",
  weddingDay: "  15  ",
  weddingMonth: "  junio  ",
  weddingYear: "  2026  ",
  weddingHour: "  18  ",
  weddingMinute: "  30  ",
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
  transportEnabled: "  bus  ",
  transportDepartures: '[{"time":"12:00","url":"https://www.google.com/maps/place/X"}]',
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
    expect(result.weddingSiteURL).toBe("https://www.google.com/maps/place/Iglesia+San+Jos%C3%A9/@40.4,-3.7,15z");
  });

  it("normalizes weddingMapView to valid values", () => {
    expect(normalizeConfig({ weddingMapView: "satellite" }).weddingMapView).toBe("satellite");
    expect(normalizeConfig({ weddingMapView: "hybrid" }).weddingMapView).toBe("hybrid");
    expect(normalizeConfig({ weddingMapView: "roadmap" }).weddingMapView).toBe("roadmap");
    expect(normalizeConfig({ weddingMapView: "weird" }).weddingMapView).toBe("roadmap");
    expect(normalizeConfig({}).weddingMapView).toBe("roadmap");
  });

  it("normalizes weddingMapStatic to string boolean", () => {
    expect(normalizeConfig({ weddingMapStatic: "true" }).weddingMapStatic).toBe("true");
    expect(normalizeConfig({ weddingMapStatic: "false" }).weddingMapStatic).toBe("false");
    expect(normalizeConfig({ weddingMapStatic: "yes" }).weddingMapStatic).toBe("false");
    expect(normalizeConfig({}).weddingMapStatic).toBe("false");
  });

  it("migrates legacy weddingMapUrl to weddingSiteURL", () => {
    const result = normalizeConfig({ weddingMapUrl: "https://www.google.com/maps/place/Madrid" });
    expect(result.weddingSiteURL).toBe("https://www.google.com/maps/place/Madrid");
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
    expect(result.sectionOrder).toBe("hero,details,transport,info,story,gallery,gifts,accommodation,rsvp");
  });

  it("normalizes menuEnabled to string boolean", () => {
    expect(normalizeConfig({ menuEnabled: "true" }).menuEnabled).toBe("true");
    expect(normalizeConfig({ menuEnabled: "false" }).menuEnabled).toBe("false");
    expect(normalizeConfig({ menuEnabled: "yes" }).menuEnabled).toBe("false");
    expect(normalizeConfig({}).menuEnabled).toBe("false");
  });

  it("handles null/undefined input", () => {
    const result = normalizeConfig(null as unknown as Record<string, unknown>);
    expect(result.firstName).toBe("");
    expect(result.theme).toBe("golden");
    expect(result.adminUsername).toBe("");
  });

  it("preserves empty strings", () => {
    const result = normalizeConfig({ firstName: "  " });
    expect(result.firstName).toBe("");
  });

  it("converts number values to strings via s()", () => {
    const result = normalizeConfig({ weddingDay: 15, weddingYear: 2026 } as Record<string, unknown>);
    expect(result.weddingDay).toBe("15");
    expect(result.weddingYear).toBe("2026");
  });

  it("converts array values to strings via s()", () => {
    const result = normalizeConfig({ firstName: ["Juan", "Carlos"] } as unknown as Record<string, unknown>);
    expect(result.firstName).toBe("Juan");
  });

  it("handles empty array via s()", () => {
    const result = normalizeConfig({ firstName: [] } as unknown as Record<string, unknown>);
    expect(result.firstName).toBe("");
  });

  it("returns empty string for boolean values via s()", () => {
    const result = normalizeConfig({ menuEnabled: true } as unknown as Record<string, unknown>);
    expect(result.menuEnabled).toBe("false");
  });

  it("handles sectionOrder as trimmed string and appends missing sections", () => {
    const result = normalizeConfig({ sectionOrder: "  gifts,story,hero  " });
    expect(result.sectionOrder.split(",").slice(0, 3)).toEqual(["gifts", "story", "hero"]);
    expect(result.sectionOrder).toContain("details");
    expect(result.sectionOrder).toContain("transport");
  });

  it("normalizes transportEnabled to valid values", () => {
    expect(normalizeConfig({ transportEnabled: "bus" }).transportEnabled).toBe("bus");
    expect(normalizeConfig({ transportEnabled: "taxi" }).transportEnabled).toBe("taxi");
    expect(normalizeConfig({ transportEnabled: "both" }).transportEnabled).toBe("both");
    expect(normalizeConfig({ transportEnabled: "weird" }).transportEnabled).toBe("none");
    expect(normalizeConfig({}).transportEnabled).toBe("none");
  });

  it("normalizes transportDepartures: caps at 4 and sanitizes entries", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ type: i % 2 ? "taxi" : "bus", time: `1${i}:00`, url: `https://www.google.com/maps/place/A${i}` }));
    const result = normalizeConfig({ transportDepartures: JSON.stringify(five) });
    const parsed = JSON.parse(result.transportDepartures);
    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toEqual({ type: "bus", time: "10:00", url: "https://www.google.com/maps/place/A0" });
    expect(parsed[1].type).toBe("taxi");
  });

  it("returns empty departures for invalid JSON", () => {
    expect(normalizeConfig({ transportDepartures: "not-json" }).transportDepartures).toBe("");
  });

  it("normalizes weddingScheduleEvents: caps at 10 and sanitizes entries", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => ({ time: `${String(i).padStart(2, "0")}:00`, text: `Evento ${i}` }));
    const result = normalizeConfig({ weddingScheduleEvents: JSON.stringify(twelve) });
    const parsed = JSON.parse(result.weddingScheduleEvents);
    expect(parsed).toHaveLength(10);
    expect(parsed[0]).toEqual({ time: "00:00", text: "Evento 0", emoji: "" });
  });

  it("truncates schedule event text to 60 characters", () => {
    const result = normalizeConfig({ weddingScheduleEvents: JSON.stringify([{ time: "12:00", text: "x".repeat(80) }]) });
    const parsed = JSON.parse(result.weddingScheduleEvents);
    expect(parsed[0].text).toHaveLength(60);
  });

  it("returns empty schedule events for invalid JSON", () => {
    expect(normalizeConfig({ weddingScheduleEvents: "not-json" }).weddingScheduleEvents).toBe("");
  });

  it("normalizes menu dishes: caps at 20, sanitizes order and truncates text", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ order: i % 2 ? "primero" : "entrante", text: `Plato ${i}` }));
    const result = normalizeConfig({ menuTextoDishes: JSON.stringify(many) });
    const parsed = JSON.parse(result.menuTextoDishes);
    expect(parsed).toHaveLength(20);
    expect(parsed[0]).toEqual({ order: "entrante", text: "Plato 0" });
  });

  it("falls back to 'otro' for unknown dish orders and drops invalid JSON", () => {
    const result = normalizeConfig({ menuCarneDishes: JSON.stringify([{ order: "desayuno", text: "Tostadas" }]) });
    expect(JSON.parse(result.menuCarneDishes)).toEqual([{ order: "otro", text: "Tostadas" }]);
    expect(normalizeConfig({ menuPescadoDishes: "not-json" }).menuPescadoDishes).toBe("");
  });

  it("drops malformed menu dish entries and empty dish texts", () => {
    const result = normalizeConfig({
      menuTextoDishes: JSON.stringify([null, 42, { order: "primero", text: 7 }, { order: "primero", text: "  Plato  " }]),
    });
    const parsed = JSON.parse(result.menuTextoDishes);
    // La fila con texto no string (7 → "") y vacía se descarta: un menú con
    // platos sin texto no debe persistirse ni mostrarse.
    expect(parsed).toEqual([{ order: "primero", text: "Plato" }]);
  });

  it("returns empty for non-array JSON in menu dishes", () => {
    expect(normalizeConfig({ menuCarneDishes: '{"a":1}' }).menuCarneDishes).toBe("");
    expect(normalizeConfig({ menuCarneDishes: 123 }).menuCarneDishes).toBe("");
  });

  it("returns empty for non-array JSON in schedule events", () => {
    expect(normalizeConfig({ weddingScheduleEvents: '{"a":1}' }).weddingScheduleEvents).toBe("");
    expect(normalizeConfig({ weddingScheduleEvents: 123 }).weddingScheduleEvents).toBe("");
  });

  it("drops malformed schedule entries and non-string fields", () => {
    const result = normalizeConfig({
      weddingScheduleEvents: JSON.stringify([null, 42, { time: 5, text: "  Hola  " }]),
    });
    expect(JSON.parse(result.weddingScheduleEvents)).toEqual([{ time: "", text: "Hola", emoji: "" }]);
  });

  it("returns empty for non-array JSON in transport departures", () => {
    expect(normalizeConfig({ transportDepartures: '{"a":1}' }).transportDepartures).toBe("");
    expect(normalizeConfig({ transportDepartures: 123 }).transportDepartures).toBe("");
  });

  it("drops malformed transport entries and defaults taxi type", () => {
    const result = normalizeConfig({
      transportDepartures: JSON.stringify([null, 42, { type: "taxi", time: 5, url: 7 }, { time: "10:00", url: "" }]),
    });
    const parsed = JSON.parse(result.transportDepartures);
    expect(parsed).toEqual([{ type: "taxi", time: "", url: "" }, { type: "bus", time: "10:00", url: "" }]);
  });

  it("normalizes the map display modes and defaults to iframe", () => {
    const result = normalizeConfig({ detailsMapMode: "name", transportMapMode: "hidden", accommodationMapMode: "bogus" });
    expect(result.detailsMapMode).toBe("name");
    expect(result.transportMapMode).toBe("hidden");
    expect(result.accommodationMapMode).toBe("iframe");
  });
});

describe("normalizeConfig social fields", () => {
  it("keeps and normalizes the new social fields", () => {
    const result = normalizeConfig({
      firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "enero", weddingYear: "2026",
      weddingHour: "1", weddingMinute: "1", theme: "golden",
      rsvpDeadline: "2026-06-01", rsvpDeadlineEnabled: "true",
      reactionsEnabled: "true", giftsListEnabled: "true",
      giftList: JSON.stringify([{ id: "g1", name: "Tostadora", description: "Roja" }]),
      rideShareEnabled: "true", welcomeVideo: "https://example.com/v.mp4",
      notesEnabled: "true", musicPollEnabled: "true", triviaEnabled: "true",
      trivia: JSON.stringify([{ q: "¿Dónde?", a: "En el parque" }]),
    });
    expect(result.rsvpDeadline).toBe("2026-06-01");
    expect(result.rsvpDeadlineEnabled).toBe("true");
    expect(result.reactionsEnabled).toBe("true");
    expect(result.giftsListEnabled).toBe("true");
    expect(result.giftList).toContain("Tostadora");
    expect(result.rideShareEnabled).toBe("true");
    expect(result.welcomeVideo).toBe("https://example.com/v.mp4");
    expect(result.notesEnabled).toBe("true");
    expect(result.musicPollEnabled).toBe("true");
    expect(result.triviaEnabled).toBe("true");
    expect(result.trivia).toContain("En el parque");
  });

  it("sanitizes invalid JSON in giftList/trivia to []", () => {
    const result = normalizeConfig({ giftList: "{broken", trivia: "nope" });
    expect(result.giftList).toBe("[]");
    expect(result.trivia).toBe("[]");
  });

  it("normalizes the enabled flags to true/false", () => {
    const result = normalizeConfig({ rsvpDeadlineEnabled: "yes", reactionsEnabled: "on" });
    expect(result.rsvpDeadlineEnabled).toBe("false");
    expect(result.reactionsEnabled).toBe("false");
  });
});
