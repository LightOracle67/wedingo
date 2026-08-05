import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockInit = vi.hoisted(() => vi.fn());
const mockBrowserTracingIntegration = vi.hoisted(() => vi.fn(() => "tracing"));
const mockReplayIntegration = vi.hoisted(() => vi.fn(() => "replay"));

vi.mock("@sentry/react", () => ({
  init: mockInit,
  browserTracingIntegration: mockBrowserTracingIntegration,
  replayIntegration: mockReplayIntegration,
}));

describe("sentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("initializes Sentry when in production (deferred to idle)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    // requestIdleCallback disponible: se ejecuta la inicialización.
    const idleCallback = vi.fn((cb: () => void) => { cb(); return 0; });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({
        environment: "production",
        dsn: "https://dsn",
      }));
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
    const idleCallback = vi.fn((cb: () => void) => { cb(); return 0; });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    expect(mockReplayIntegration).not.toHaveBeenCalled();
  });
});
