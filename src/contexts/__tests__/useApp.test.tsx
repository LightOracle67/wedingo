import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApp, AppContext } from "../useApp";

describe("useApp", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useApp())).toThrow("useApp debe usarse dentro de AppProvider");
  });

  it("returns context value when provided", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppContext.Provider value={{ test: true }}>{children}</AppContext.Provider>
    );
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current).toEqual({ test: true });
  });
});
