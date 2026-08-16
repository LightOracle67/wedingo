import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLinesField } from "../useLinesField";

interface Gift {
  name: string;
  description: string;
}

const giftOptions = {
  parseLine: (line: string): Gift | null => {
    const [name, ...rest] = line.split("|");
    return { name: (name || "").trim().slice(0, 100), description: rest.join("|").trim().slice(0, 200) };
  },
  itemToLine: (g: Gift) => `${g.name ?? ""} | ${g.description ?? ""}`,
};

describe("useLinesField", () => {
  it("convierte JSON a líneas (toLines)", () => {
    const { result } = renderHook(() => useLinesField<Gift>(giftOptions));
    expect(result.current.toLines(JSON.stringify([{ name: "Tostadora", description: "Nueva" }]))).toBe(
      "Tostadora | Nueva",
    );
    expect(result.current.toLines('[{"name":"A"}]')).toBe("A | ");
    expect(result.current.toLines("{no-es-array}")).toBe("");
  });

  it("convierte líneas a JSON (parseText) descartando las vacías", () => {
    const { result } = renderHook(() => useLinesField<Gift>(giftOptions));
    expect(result.current.parseText("Tostadora | Nueva\n\nTaza | Azul")).toBe(
      JSON.stringify([{ name: "Tostadora", description: "Nueva" }, { name: "Taza", description: "Azul" }]),
    );
  });

  it("acota el número de líneas a maxLines", () => {
    const { result } = renderHook(() => useLinesField<Gift>({ ...giftOptions, maxLines: 2 }));
    const text = "A | 1\nB | 2\nC | 3";
    const parsed = JSON.parse(result.current.parseText(text)) as Gift[];
    expect(parsed).toHaveLength(2);
  });

  it("parseLine puede devolver null para descartar una línea", () => {
    const { result } = renderHook(() =>
      useLinesField<Gift>({
        parseLine: (line) => {
          const [name] = line.split("|");
          // Descarta la línea que empiece por "B".
          return name && name.trim() !== "B" ? { name: name.trim(), description: "" } : null;
        },
        itemToLine: (g) => g.name,
      }),
    );
    expect(result.current.parseText("A\nB\nC")).toBe(JSON.stringify([{ name: "A", description: "" }, { name: "C", description: "" }]));
  });
});
