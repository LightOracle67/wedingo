import { describe, it, expect } from "vitest";
import {
  normalizeManualName,
  buildManualMainPayload,
  buildManualCompanionPayload,
} from "../attendance-core";

// Encrypt de identidad para los tests: no hace falta la lógica de cifrado real.
const fakeEncrypt = async (v: string) => `enc:${v}`;

describe("normalizeManualName", () => {
  it("convierte el nombre a minúsculas sin tildes y con guiones bajos", () => {
    expect(normalizeManualName("Ana García López")).toBe("ana_garcia_lopez");
  });

  it("recorta a 30 caracteres", () => {
    const long = "a".repeat(60);
    expect(normalizeManualName(long)).toBe("a".repeat(30));
  });
});

describe("buildManualMainPayload", () => {
  it("construye el esquema mínimo que cumple la whitelist de reglas", async () => {
    const payload = await buildManualMainPayload(
      { name: "Ana García López", attendance: "no", allergySelection: [], allergyOther: "", transportMode: "own" },
      "tok",
      { seconds: 1 },
      fakeEncrypt,
    );
    expect(payload.rsvpType).toBe("main");
    expect(payload.guestName).toBe("Ana García López");
    expect(payload.attendance).toBe("no");
    expect(payload.dietaryInfo).toBe("");
    expect(payload.inviteToken).toBe("tok");
    expect(payload.privacyConsent).toBe(true);
    // Sin asistencia no se añaden campos condicionales.
    expect(payload.mealChoice).toBeUndefined();
    expect(payload.transportMode).toBeUndefined();
  });

  it("aflana alergias en ' | ' y las cifra cuando el invitado asiste", async () => {
    const payload = await buildManualMainPayload(
      {
        name: "María Rodríguez Fernández",
        attendance: "yes",
        allergySelection: ["sin gluten", "sin lactosa"],
        allergyOther: "frutos secos",
        transportMode: "bus",
        transportChoice: "0",
      },
      "tok",
      123,
      fakeEncrypt,
    );
    expect(payload.dietaryInfo).toBe(`enc:sin gluten | sin lactosa | frutos secos`);
    expect(payload.healthConsent).toBe(true);
    expect(payload.healthConsentAt).toBe(123);
    expect(payload.transportMode).toBe("bus");
    expect(payload.transportChoice).toBe("0");
  });

  it("añade los datos de acompañantes solo si hay alguno", async () => {
    const payload = await buildManualMainPayload(
      {
        name: "Laura",
        attendance: "yes",
        allergySelection: [],
        allergyOther: "",
        transportMode: "own",
        companions: [
          { name: "Carlos", menu: "pescado", allergies: ["sin lactosa"], other: "" },
          { name: "Lucía", menu: "", allergies: [], other: "kiwi" },
        ],
      },
      "tok",
      5,
      fakeEncrypt,
    );
    expect(payload.companionCount).toBe(2);
    expect(payload.companionNames).toEqual(["Carlos", "Lucía"]);
    expect(payload.companionMenus).toEqual(["pescado", ""]);
    expect(payload.companionAllergies).toEqual(["sin lactosa", "kiwi"]);
    expect(payload.companionAllergiesOther).toEqual(["", "kiwi"]);
  });
});

describe("buildManualCompanionPayload", () => {
  it("crea el documento de acompañante enlazado al principal", async () => {
    const payload = await buildManualCompanionPayload(
      { name: "Carlos Ruiz", allergies: ["sin lactosa"], other: "" },
      "tok",
      9,
      "main_abc",
      "María Rodríguez Fernández",
      fakeEncrypt,
    );
    expect(payload.rsvpType).toBe("companion");
    expect(payload.guestName).toBe("Carlos Ruiz");
    expect(payload.attendance).toBe("yes");
    expect(payload.dietaryInfo).toBe("enc:sin lactosa");
    expect(payload.mainGuestDocId).toBe("main_abc");
    expect(payload.mainGuestName).toBe("María Rodríguez Fernández");
    expect(payload.healthConsent).toBe(true);
  });

  it("no cifra ni marca consentimiento cuando el acompañante no tiene alergias", async () => {
    const payload = await buildManualCompanionPayload(
      { name: "Raúl", allergies: [], other: "" },
      "tok",
      9,
      "main_abc",
      "Ana",
      fakeEncrypt,
    );
    expect(payload.dietaryInfo).toBe("");
    expect(payload.healthConsent).toBeUndefined();
  });
});
