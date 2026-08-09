import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRowSelection } from "../useRowSelection";

describe("useRowSelection", () => {
  it("toggle alterna una fila", () => {
    const { result } = renderHook(() => useRowSelection());
    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.selectedCount).toBe(1);
    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("toggleAll selecciona todas y deselecciona si ya están todas", () => {
    const { result } = renderHook(() => useRowSelection());
    act(() => result.current.toggleAll(["a", "b", "c"]));
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.allSelected).toBe(true);
    act(() => result.current.toggleAll(["a", "b", "c"]));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.allSelected).toBe(false);
  });

  it("setSelectedIds reemplaza la selección y clear la vacía", () => {
    const { result } = renderHook(() => useRowSelection());
    act(() => result.current.setSelectedIds(["x", "y"]));
    expect(result.current.selectedCount).toBe(2);
    act(() => result.current.clear());
    expect(result.current.selectedCount).toBe(0);
  });
});
