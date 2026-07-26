import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth, AuthContext } from "../useAuth";

describe("useAuth", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useAuth())).toThrow("useAuth debe usarse dentro de AppProvider");
  });

  it("returns context value when provided", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={{ test: true }}>{children}</AuthContext.Provider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toEqual({ test: true });
  });
});
