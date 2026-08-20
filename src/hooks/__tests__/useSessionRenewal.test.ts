import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionRenewal } from "../useSessionRenewal";
import * as sessionVars from "../../lib/sessionVars";

describe("useSessionRenewal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renueva la sesión inmediatamente y después en intervalos mientras enabled", () => {
    const renewSpy = vi.spyOn(sessionVars, "renewSession").mockImplementation(() => {});
    renderHook(({ enabled }) => useSessionRenewal(enabled), { initialProps: { enabled: true } });
    // Llamada inicial al montar.
    expect(renewSpy).toHaveBeenCalledTimes(1);
    // Avanza 60s -> se renueva una vez más.
    act(() => vi.advanceTimersByTime(60_000));
    expect(renewSpy).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(120_000));
    expect(renewSpy).toHaveBeenCalledTimes(4);
  });

  it("detiene la renovación al deshabilitar y no vuelve a llamar", () => {
    const renewSpy = vi.spyOn(sessionVars, "renewSession").mockImplementation(() => {});
    const { rerender } = renderHook(({ enabled }) => useSessionRenewal(enabled), {
      initialProps: { enabled: true },
    });
    expect(renewSpy).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    // Con un timer previo (60s) pendiente, al deshabilitar se limpia: no debe
    // llamarse a los 60s.
    act(() => vi.advanceTimersByTime(120_000));
    expect(renewSpy).toHaveBeenCalledTimes(1);
  });

  it("limpia el intervalo al desmontar", () => {
    const renewSpy = vi.spyOn(sessionVars, "renewSession").mockImplementation(() => {});
    const { unmount } = renderHook(() => useSessionRenewal(true));
    const callsAfterMount = renewSpy.mock.calls.length;
    unmount();
    act(() => vi.advanceTimersByTime(180_000));
    expect(renewSpy.mock.calls.length).toBe(callsAfterMount);
  });
});
