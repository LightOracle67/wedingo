import { describe, it, expect } from "vitest";
import { stableGuestId } from "../guest-id";

/** Caracterización del hash FNV-1a base36: estos valores son IDs de documentos
 *  en producción (rsvpResponses y confirmedPeople). Congelarlos garantiza que
 *  la extracción no altera la idempotencia: un reintento debe seguir apuntando
 *  al mismo doc que ya existía. */
describe("stableGuestId", () => {
  it("produce los hashes congelados de producción", () => {
    expect(stableGuestId("")).toBe("ztntfp");
    expect(stableGuestId("Ana García López")).toBe("19zw2ee");
    expect(stableGuestId("x")).toBe("1y7mkjr");
    // Par astral (🎉 = 2 code units): ejercita el bucle charCodeAt por pares.
    expect(stableGuestId("🎉")).toBe("swncdy");
  });

  it("es determinista e independiente del orden de llamadas", () => {
    const a = stableGuestId("Beto Perez Ruiz");
    for (let i = 0; i < 5; i++) expect(stableGuestId("Beto Perez Ruiz")).toBe(a);
    expect(stableGuestId("Beto Perez Ruiz ")).not.toBe(a);
  });
});
