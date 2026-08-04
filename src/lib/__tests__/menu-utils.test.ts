import { describe, it, expect } from "vitest";
import { parseMenuDishes } from "../menu-utils";

describe("menu-utils", () => {
  it("returns an empty array for empty input", () => {
    expect(parseMenuDishes("")).toEqual([]);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseMenuDishes("not-json")).toEqual([]);
    expect(parseMenuDishes("{broken")).toEqual([]);
  });

  it("returns an empty array when the parsed value is not an array", () => {
    expect(parseMenuDishes('{"a": 1}')).toEqual([]);
    expect(parseMenuDishes("42")).toEqual([]);
  });

  it("parses a valid dish list", () => {
    const json = JSON.stringify([
      { order: "entrante", text: "Ensalada" },
      { order: "postre", text: "Tarta" },
    ]);
    expect(parseMenuDishes(json)).toEqual([
      { order: "entrante", text: "Ensalada" },
      { order: "postre", text: "Tarta" },
    ]);
  });

  it("falls back to 'otro' for an unknown order", () => {
    const json = JSON.stringify([{ order: "bogus", text: "Plato" }]);
    expect(parseMenuDishes(json)).toEqual([{ order: "otro", text: "Plato" }]);
  });

  it("drops dishes without text and non-string text", () => {
    const json = JSON.stringify([
      { order: "primero", text: "" },
      { order: "segundo", text: 42 },
      { order: "postre", text: "Sí" },
    ]);
    expect(parseMenuDishes(json)).toEqual([{ order: "postre", text: "Sí" }]);
  });

  it("truncates text to the max dish text length", () => {
    const longText = "x".repeat(300);
    const json = JSON.stringify([{ order: "primero", text: longText }]);
    expect(parseMenuDishes(json)[0]!.text).toHaveLength(200);
  });

  it("limits the parsed list to the max number of dishes", () => {
    const dishes = Array.from({ length: 50 }, (_, i) => ({ order: "otro", text: `Plato ${i}` }));
    expect(parseMenuDishes(JSON.stringify(dishes))).toHaveLength(20);
  });
});
