import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockInit = vi.hoisted(() => vi.fn());
const mockBrowserTracingIntegration = vi.hoisted(() => vi.fn(() => "tracing"));
const mockReplayIntegration = vi.hoisted(() => vi.fn(() => "replay"));
const mockClose = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
const mockGetReplay = vi.hoisted(() => vi.fn(() => ({ stop: vi.fn() })));

vi.mock("@sentry/react", () => ({
  init: mockInit,
  browserTracingIntegration: mockBrowserTracingIntegration,
  replayIntegration: mockReplayIntegration,
  getReplay: mockGetReplay,
  close: mockClose,
}));

describe("sentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Consentimiento de analítica aceptado (Sentry se gatea por él).
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) =>
          k === "wedin_cookie_consent"
            ? "accepted"
            : k === "wedin_cookie_prefs"
              ? '{"necessary":true,"analytics":true}'
              : null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("does not init in non-production without a DSN", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "");
    vi.resetModules();
    await import("../sentry");
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("does not init without analytics consent (RGPD)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    // Sin consentimiento: localStorage devuelve null.
    Object.defineProperty(globalThis, "localStorage", {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
      configurable: true,
    });
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    await import("../sentry");
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("initializes Sentry when in production (deferred to idle)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    // requestIdleCallback disponible: se ejecuta la inicialización.
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "production",
          dsn: "https://dsn",
        }),
      );
    });
  });

  it("falls back to the load event when requestIdleCallback is unavailable", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    Object.defineProperty(globalThis, "requestIdleCallback", { value: undefined, configurable: true });
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    const addListener = vi.fn();
    window.addEventListener = addListener;
    vi.resetModules();
    await import("../sentry");
    expect(addListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });
  });

  it("runs immediately when the document is complete", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    Object.defineProperty(globalThis, "requestIdleCallback", { value: undefined, configurable: true });
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
  });

  it("does not include replay integration outside production", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    expect(mockReplayIntegration).not.toHaveBeenCalled();
  });

  it("disableSentryTracking detiene el replay y cierra el cliente (GDPR art. 7.3)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    const sentry = await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    sentry.disableSentryTracking();
    await vi.waitFor(() => {
      expect(mockGetReplay).toHaveBeenCalled();
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it("enableSentryTracking solo inicializa una vez (guard)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    const sentry = await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    const calls = mockInit.mock.calls.length;
    // Segundo enable: no vuelve a inicializar.
    await sentry.enableSentryTracking();
    expect(mockInit.mock.calls.length).toBe(calls);
  });
});
