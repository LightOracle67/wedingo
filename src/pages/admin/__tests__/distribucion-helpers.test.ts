import { describe, it, expect } from "vitest";
import { assignGuestsToTables, clampPercent } from "../distribucion-helpers";

describe("distribucion-helpers", () => {
  it("asigna invitados a mesas con hueco en round-robin", () => {
    const tables = [
      { id: "a", slots: 2 },
      { id: "b", slots: 1 },
    ];
    const res = assignGuestsToTables(["Ana", "Beto", "Carla"], tables);
    expect(res).toEqual({ a: ["Ana", "Carla"], b: ["Beto"] });
  });

  it("se detiene si no quedan mesas con hueco", () => {
    const res = assignGuestsToTables(["Ana", "Beto", "Carla"], [{ id: "a", slots: 1 }]);
    expect(res).toEqual({ a: ["Ana"] });
  });

  it("devuelve vacío si no hay mesas", () => {
    expect(assignGuestsToTables(["Ana"], [])).toEqual({});
  });

  it("clampPercent acota al rango [0,100]", () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(105)).toBe(100);
    expect(clampPercent(50)).toBe(50);
  });
});
