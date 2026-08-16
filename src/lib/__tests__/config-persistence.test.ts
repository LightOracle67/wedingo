import { describe, it, expect } from "vitest";
import { normalizeConfig } from "../normalize-config";
import { defaultConfig, STORY_SECTION_ORDER } from "../constants";
import type { InvitationConfig } from "../../types";

const FULL_CONFIG: Record<string, unknown> = {
  adminUsername: "novios2026",
  firstName: "Ana",
  secondName: "Luis",
  inviteMessage: "Nos casamos",
  theme: "rose",
  weddingDay: "15",
  weddingMonth: "junio",
  weddingYear: "2027",
  weddingHour: "18",
  weddingMinute: "30",
  weddingPlace: "Hacienda Los Olivos",
  weddingSiteURL: "https://www.google.com/maps/place/Hacienda+Los+Olivos/@37.5,-4.7,17z",
  weddingMapView: "satellite",
  weddingMapStatic: "true",
  weddingDressCode: "gala",
  couplePhoto: "__cfgimg:couplePhoto",
  musicFile: "audio.mp3",
  musicUrl: "",
  sectionOrder: STORY_SECTION_ORDER.join(","),
  hiddenSections: "gifts",
  storyText: "Nuestra historia",
  giftsInfo: "Sobres en el lugar",
  bankInfo: "ES00 1234 5678",
  transportEnabled: "both",
  transportDepartures: JSON.stringify([
    { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
    { type: "taxi", time: "14:30", url: "" },
  ]),
  godparent1: "Marta",
  godparent2: "Jorge",
  kidsPolicy: "playArea",
  menuEnabled: "true",
  menuTextoDishes: JSON.stringify([
    { order: "entrante", text: "Ensalada" },
    { order: "primero", text: "Lubina" },
    { order: "postre", text: "Tarta" },
  ]),
  menuCarneDishes: JSON.stringify([
    { order: "entrante", text: "Ensalada" },
    { order: "segundo", text: "Solomillo" },
  ]),
  menuPescadoDishes: JSON.stringify([{ order: "segundo", text: "Lubina al horno" }]),
  menuVeganoDishes: "",
  backgroundImage: "__cfgimg:backgroundImage",
  customSeal: "__cfgimg:customSeal",
  cornerDecoration: "__cfgimg:cornerDecoration",
};

describe("Persistencia de la configuración", () => {
  it("normalizeConfig emite todos los campos requeridos de InvitationConfig", () => {
    const normalized = normalizeConfig(FULL_CONFIG);
    const typeKeys = Object.keys({} as InvitationConfig).filter((k) => !k.startsWith("_"));
    for (const key of typeKeys) {
      expect(normalized, `campo faltante en normalizeConfig: ${key}`).toHaveProperty(key);
    }
  });

  it("el payload de guardado (defaultConfig + normalized) contiene todos los campos con sus valores", () => {
    const normalized = normalizeConfig(FULL_CONFIG);
    const payload = { ...defaultConfig, ...normalized };
    const checks: Array<[string, unknown]> = [
      ["adminUsername", "novios2026"],
      ["firstName", "Ana"],
      ["theme", "rose"],
      ["weddingSiteURL", "https://www.google.com/maps/place/Hacienda+Los+Olivos/@37.5,-4.7,17z"],
      ["weddingMapView", "satellite"],
      ["weddingMapStatic", "true"],
      ["transportEnabled", "both"],
      ["backgroundImage", "__cfgimg:backgroundImage"],
      ["customSeal", "__cfgimg:customSeal"],
      ["cornerDecoration", "__cfgimg:cornerDecoration"],
      ["hiddenSections", "gifts"],
      ["menuEnabled", "true"],
      [
        "menuCarneDishes",
        JSON.stringify([
          { order: "entrante", text: "Ensalada" },
          { order: "segundo", text: "Solomillo" },
        ]),
      ],
    ];
    for (const [key, expected] of checks) {
      expect(payload[key as keyof typeof payload], `payload.${key}`).toBe(expected);
    }
    // Todos los campos de InvitationConfig existen en el payload
    for (const key of Object.keys(normalized)) {
      expect(payload, `payload.${key} ausente`).toHaveProperty(key);
    }
  });

  it("round-trip: normalize(normalize(x)) es idempotente y preserva todos los valores", () => {
    const first = normalizeConfig(FULL_CONFIG);
    const second = normalizeConfig({ ...first });
    for (const key of Object.keys(first)) {
      expect(second[key as keyof typeof second]).toEqual(first[key as keyof typeof first]);
    }
  });

  it("recuperación: los campos guardados en Firestore se restauran completos al cargar", () => {
    // Simula lo que hace reloadConfig: docData -> normalizeConfig -> hydrated
    const docData = normalizeConfig(FULL_CONFIG);
    const hydrated = { ...defaultConfig, ...docData };
    expect(hydrated.transportDepartures).toBe(
      JSON.stringify([
        { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
        { type: "taxi", time: "14:30", url: "" },
      ]),
    );
    const parsedDepartures = JSON.parse(hydrated.transportDepartures);
    expect(parsedDepartures).toHaveLength(2);
    expect(parsedDepartures[0].type).toBe("bus");
    expect(parsedDepartures[1].type).toBe("taxi");
    expect(hydrated.sectionOrder.split(",")).toHaveLength(STORY_SECTION_ORDER.length);
    expect(hydrated.couplePhoto).toBe("__cfgimg:couplePhoto");
    expect(hydrated.menuTextoDishes).toBe(
      JSON.stringify([
        { order: "entrante", text: "Ensalada" },
        { order: "primero", text: "Lubina" },
        { order: "postre", text: "Tarta" },
      ]),
    );
    const parsedDishes = JSON.parse(hydrated.menuCarneDishes);
    expect(parsedDishes).toHaveLength(2);
    expect(parsedDishes[1]).toEqual({ order: "segundo", text: "Solomillo" });
    expect(hydrated.menuVeganoDishes).toBe("");
  });

  it("round-trip: los platos del menú sobreviven normalize y el payload", () => {
    const normalized = normalizeConfig(FULL_CONFIG);
    const payload = { ...defaultConfig, ...normalized };
    expect(JSON.parse(payload.menuTextoDishes)).toHaveLength(3);
    expect(JSON.parse(payload.menuCarneDishes)[1].order).toBe("segundo");
    const again = normalizeConfig({ ...normalized });
    expect(again.menuTextoDishes).toBe(normalized.menuTextoDishes);
    expect(again.menuCarneDishes).toBe(normalized.menuCarneDishes);
  });

  it("migración: sectionOrder antiguo (sin transport) se completa al cargar", () => {
    const oldOrder = "hero,details,info,story,gallery,gifts,accommodation,rsvp";
    const normalized = normalizeConfig({ sectionOrder: oldOrder });
    const parts = normalized.sectionOrder.split(",");
    expect(parts).toHaveLength(STORY_SECTION_ORDER.length);
    expect(parts).toContain("transport");
    // El orden antiguo se preserva; transport se añade al final
    expect(parts.slice(0, 8)).toEqual(oldOrder.split(","));
  });

  it("valores vacíos se preservan (no se convierten en undefined)", () => {
    const normalized = normalizeConfig({});
    const payload = { ...defaultConfig, ...normalized };
    for (const key of Object.keys(payload)) {
      expect(payload[key as keyof typeof payload]).not.toBeUndefined();
    }
  });
});
