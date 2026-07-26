import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAppUI, UIContext } from "../useAppUI";

describe("useAppUI", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useAppUI())).toThrow("useAppUI debe usarse dentro de AppProvider");
  });

  it("returns context value when provided", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UIContext.Provider value={{ test: true }}>{children}</UIContext.Provider>
    );
    const { result } = renderHook(() => useAppUI(), { wrapper });
    expect(result.current).toEqual({ test: true });
  });
});
