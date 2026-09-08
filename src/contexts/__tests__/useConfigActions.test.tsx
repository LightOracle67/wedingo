import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useConfigActions, ConfigActionsContext } from "../useConfigActions";

const value = {
  updateFormField: vi.fn(),
  handleDayChange: vi.fn(),
  handleTimeChange: vi.fn(),
  handleTimeBlur: vi.fn(),
  handleYearChange: vi.fn(),
  maxAllowedYear: 2099,
  inviteToken: "abc123",
  hasStoredConfig: false,
};

describe("useConfigActions", () => {
  it("lanza si no hay provider (contrato del hook del editor)", () => {
    expect(() => renderHook(() => useConfigActions())).toThrow(/useConfigActions debe usarse/);
  });

  it("devuelve el valor del contexto cuando hay provider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConfigActionsContext.Provider value={value}>{children}</ConfigActionsContext.Provider>
    );
    const { result } = renderHook(() => useConfigActions(), { wrapper });
    expect(result.current.inviteToken).toBe("abc123");
    expect(result.current.updateFormField).toBe(value.updateFormField);
  });
});