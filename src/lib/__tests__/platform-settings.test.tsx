import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { isFeatureDisabled, tokenIsBlocked, usePlatformSettings, type PlatformSettings } from "../platform-settings";

const mockGetDoc = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  doc: vi.fn(() => "platform-settings-ref"),
}));
vi.mock("../firebase", () => ({ db: "db-mock" }));

/** Dispara el evento load que usa el fallback de idle cuando no hay requestIdleCallback. */
function fireIdleLoad() {
  window.dispatchEvent(new Event("load"));
}

describe("isFeatureDisabled / tokenIsBlocked", () => {
  it("detecta funciones desactivadas ignorando mayúsculas y espacios", () => {
    const s: PlatformSettings = { disabledFeatures: " gifts, TRIVIA ," } as PlatformSettings;
    expect(isFeatureDisabled(s, "gifts")).toBe(true);
    expect(isFeatureDisabled(s, "trivia")).toBe(true);
    expect(isFeatureDisabled(s, "gallery")).toBe(false);
  });

  it("no marca nada si la lista está vacía", () => {
    expect(isFeatureDisabled({ disabledFeatures: "" } as PlatformSettings, "gifts")).toBe(false);
  });

  it("bloquea tokens por lista (minúsculas, sin espacios)", () => {
    expect(tokenIsBlocked("AbC123", "abc123,def456")).toBe(true);
    expect(tokenIsBlocked("xyz", "abc123")).toBe(false);
    expect(tokenIsBlocked("x", "")).toBe(false);
  });
});

describe("usePlatformSettings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    window.removeEventListener("load", fireIdleLoad as EventListener);
  });

  it("carga los ajustes del documento de plataforma", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ maintenance: "true", expiringDays: "60" }) });
    const { result } = renderHook(() => usePlatformSettings());
    fireIdleLoad();
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.settings.maintenance).toBe("true");
    expect(result.current.settings.expiringDays).toBe("60");
    // Los campos ausentes se completan con los valores por defecto.
    expect(result.current.settings.disabledFeatures).toBe("");
  });

  it("usa los valores por defecto si el documento no existe", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    const { result } = renderHook(() => usePlatformSettings());
    fireIdleLoad();
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const expected: PlatformSettings = {
      maintenance: "false",
      bannerEnabled: "false",
      bannerText: "",
      blockedUrls: "",
      blockedTokens: "",
      expiringDays: "30",
      disabledFeatures: "",
    };
    expect(result.current.settings).toEqual(expected);
  });

  it("cae a valores por defecto si la lectura falla (pero no se bloquea)", async () => {
    mockGetDoc.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => usePlatformSettings());
    fireIdleLoad();
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.settings.maintenance).toBe("false");
  });
});