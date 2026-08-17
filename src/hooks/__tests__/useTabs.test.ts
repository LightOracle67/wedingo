import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabs } from "../useTabs";

const mockParams = vi.hoisted(() => new URLSearchParams());
const mockSetSearchParams = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({
  useSearchParams: () => [mockParams, mockSetSearchParams],
}));

const KEYS = ["panel", "invitacion", "asistencia"] as const;

describe("useTabs", () => {
  it("usa la pestaña por defecto cuando no hay ?tab", () => {
    mockParams.delete("tab");
    const { result } = renderHook(() => useTabs(KEYS, "panel"));
    expect(result.current.activeTab).toBe("panel");
  });

  it("inicializa desde la URL", () => {
    mockParams.set("tab", "invitacion");
    const { result } = renderHook(() => useTabs(KEYS, "panel"));
    expect(result.current.activeTab).toBe("invitacion");
  });

  it("select actualiza el estado y la URL", () => {
    mockParams.delete("tab");
    const { result } = renderHook(() => useTabs(KEYS, "panel"));
    act(() => result.current.select("asistencia"));
    expect(result.current.activeTab).toBe("asistencia");
    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: "asistencia" });
  });

  it("el botón atrás (cambio de ?tab) sincroniza el estado", () => {
    mockParams.delete("tab");
    const { result, rerender } = renderHook(() => useTabs(KEYS, "panel"));
    // Cambia la URL externamente (navegación atrás/adelante) y re-renderiza.
    mockParams.set("tab", "invitacion");
    rerender();
    expect(result.current.activeTab).toBe("invitacion");
  });

  it("ignora valores de ?tab no válidos y vuelve al default", () => {
    mockParams.set("tab", "no-existe");
    const { result } = renderHook(() => useTabs(KEYS, "panel"));
    expect(result.current.activeTab).toBe("panel");
  });
});
