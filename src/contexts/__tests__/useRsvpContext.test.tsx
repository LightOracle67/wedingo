import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRsvpContext, RsvpContext, type RsvpValue } from "../useRsvpContext";

describe("useRsvpContext", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useRsvpContext())).toThrow("useRsvpContext debe usarse dentro de AppProvider");
  });

  it("returns context value when provided", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RsvpContext.Provider value={{ test: true } as unknown as RsvpValue}>{children}</RsvpContext.Provider>
    );
    const { result } = renderHook(() => useRsvpContext(), { wrapper });
    expect(result.current).toEqual({ test: true });
  });
});
