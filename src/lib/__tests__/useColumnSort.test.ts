import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColumnSort, type SortableColumn } from "../useColumnSort";

interface Row {
  name: string;
  age: number;
  date: string;
  ok: boolean;
  empty?: string;
}

const ROWS: Row[] = [
  { name: "beta", age: 30, date: "2023-05-10", ok: true },
  { name: "alpha", age: 10, date: "2021-01-01", ok: false },
  { name: "gamma", age: 20, date: "2022-11-20", ok: true },
  { name: "delta", age: 40, date: "2020-07-07", ok: false, empty: "" },
];

const COLUMNS: SortableColumn<Row>[] = [
  { key: "name", type: "string" },
  { key: "age", type: "number" },
  { key: "date", type: "date" },
  { key: "ok", type: "boolean" },
  { key: "empty", type: "string" },
];

describe("useColumnSort", () => {
  it("devuelve las filas sin ordenar por defecto", () => {
    const { result } = renderHook(() => useColumnSort(ROWS, COLUMNS));
    expect(result.current.sorted).toBe(ROWS);
    expect(result.current.getIndicator("name")).toBe("default");
  });

  it("cicla asc → desc → default al pulsar la misma columna", () => {
    const { result } = renderHook(() => useColumnSort(ROWS, COLUMNS));
    // asc
    act(() => result.current.toggleSort("age"));
    expect(result.current.getIndicator("age")).toBe("asc");
    expect(result.current.sorted.map((r) => r.age)).toEqual([10, 20, 30, 40]);
    // desc
    act(() => result.current.toggleSort("age"));
    expect(result.current.getIndicator("age")).toBe("desc");
    expect(result.current.sorted.map((r) => r.age)).toEqual([40, 30, 20, 10]);
    // default
    act(() => result.current.toggleSort("age"));
    expect(result.current.getIndicator("age")).toBe("default");
    expect(result.current.sorted).toBe(ROWS);
  });

  it("una columna nueva empieza siempre en ascendente", () => {
    const { result } = renderHook(() => useColumnSort(ROWS, COLUMNS));
    act(() => result.current.toggleSort("age"));
    act(() => result.current.toggleSort("age")); // desc
    act(() => result.current.toggleSort("name")); // nueva → asc
    expect(result.current.getIndicator("name")).toBe("asc");
    expect(result.current.getIndicator("age")).toBe("default");
    expect(result.current.sorted.map((r) => r.name)).toEqual(["alpha", "beta", "delta", "gamma"]);
  });

  it("ordena texto con locale (números embebidos)", () => {
    const rows = [{ n: "v2.10" }, { n: "v2.9" }, { n: "v1.5" }];
    const { result } = renderHook(() =>
      useColumnSort(rows, [{ key: "n", type: "string" }]),
    );
    act(() => result.current.toggleSort("n"));
    expect(result.current.sorted.map((r) => r.n)).toEqual(["v1.5", "v2.9", "v2.10"]);
  });

  it("ordena fechas cronológicamente", () => {
    const { result } = renderHook(() => useColumnSort(ROWS, COLUMNS));
    act(() => result.current.toggleSort("date"));
    expect(result.current.sorted.map((r) => r.name)).toEqual(["delta", "alpha", "gamma", "beta"]);
    act(() => result.current.toggleSort("date"));
    expect(result.current.sorted.map((r) => r.name)).toEqual(["beta", "gamma", "alpha", "delta"]);
  });

  it("ordena booleanos (false antes que true en asc)", () => {
    const { result } = renderHook(() => useColumnSort(ROWS, COLUMNS));
    act(() => result.current.toggleSort("ok"));
    expect(result.current.sorted[0]!.name).toBe("alpha");
    expect(result.current.sorted[3]!.name).toBe("gamma");
  });

  it("los valores vacíos van SIEMPRE al final, en cualquier dirección", () => {
    const rows = [{ n: "z" }, { n: "" }, { n: "a" }, { n: "" }];
    const { result } = renderHook(() => useColumnSort(rows, [{ key: "n", type: "string" }]));
    act(() => result.current.toggleSort("n"));
    expect(result.current.sorted.map((r) => r.n)).toEqual(["a", "z", "", ""]);
    act(() => result.current.toggleSort("n")); // desc
    expect(result.current.sorted.map((r) => r.n)).toEqual(["z", "a", "", ""]);
  });

  it("usa getValue cuando la celda muestra un valor derivado", () => {
    const rows = [{ a: "x", b: 2 }, { a: "y", b: 1 }];
    const columns: SortableColumn<{ a: string; b: number }>[] = [
      { key: "derived", type: "number", getValue: (r: { a: string; b: number }) => r.b },
    ];
    const { result } = renderHook(() => useColumnSort(rows, columns));
    act(() => result.current.toggleSort("derived"));
    expect(result.current.sorted[0]!.b).toBe(1);
  });
});
