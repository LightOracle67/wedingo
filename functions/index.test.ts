import { describe, it, expect } from "vitest";
import { weddingTimestamp, SPANISH_MONTH_INDEX } from "./index";

describe("weddingTimestamp", () => {
  it("parsea correctamente los 12 meses en español (regresión GDPR: antes daba NaN -> nunca borraba)", () => {
    // Cuadro completo: 1 de cada mes de 2024, todos deben dar timestamp válido.
    const expectedDays: Array<[string, number]> = [
      ["enero", 0],
      ["febrero", 1],
      ["marzo", 2],
      ["abril", 3],
      ["mayo", 4],
      ["junio", 5],
      ["julio", 6],
      ["agosto", 7],
      ["septiembre", 8],
      ["octubre", 9],
      ["noviembre", 10],
      ["diciembre", 11],
    ];

    for (const [month, monthIndex] of expectedDays) {
      const ts = weddingTimestamp({ weddingDay: "15", weddingMonth: month, weddingYear: "2024" });
      expect(ts).toBe(new Date(2024, monthIndex, 15).getTime());
    }

    // Todos los meses son índices 0..11 (validación del propio mapa).
    expect(Object.keys(SPANISH_MONTH_INDEX)).toHaveLength(12);
  });

  it("devuelve -1 para datos ausentes o inválidos (no se borra por error)", () => {
    expect(weddingTimestamp({})).toBe(-1);
    expect(weddingTimestamp({ weddingDay: "15", weddingMonth: "enero" })).toBe(-1);
    expect(weddingTimestamp({ weddingMonth: "enero", weddingYear: "2024" })).toBe(-1);
    expect(weddingTimestamp({ weddingDay: "15", weddingMonth: "ene", weddingYear: "2024" })).toBe(-1);
    expect(weddingTimestamp({ weddingDay: "35", weddingMonth: "enero", weddingYear: "2024" })).toBe(-1);
    expect(weddingTimestamp({ weddingDay: "15", weddingMonth: "enero", weddingYear: "abc" })).toBe(-1);
  });
});
