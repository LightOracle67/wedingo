import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLogEvent = vi.hoisted(() => vi.fn());
const mockGetAnalytics = vi.hoisted(() => vi.fn(() => ({})));
const mockIsSupported = vi.hoisted(() => vi.fn(() => Promise.resolve(false)));

vi.mock("@firebase/analytics", () => ({
  getAnalytics: mockGetAnalytics,
  logEvent: mockLogEvent,
  isSupported: mockIsSupported,
}));

// analytics.ts solo usa el token de la app; con resetModules reimporta
// firebase.ts y volver a llamar initializeFirestore(persistentLocalCache)
// lanza "already called with different options".
vi.mock("../firebase", () => ({ app: {} }));

import { trackEvent } from "../analytics";

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom no expone localStorage como global: se provee un mock propio.
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          Object.keys(store).forEach((k) => delete store[k]);
        },
      },
      configurable: true,
    });
  });

  /** Acepta el consentimiento de analítica (cookies "accepted"). */
  function grantConsent() {
    localStorage.setItem("wedin_cookie_consent", "accepted");
    localStorage.setItem("wedin_cookie_prefs", JSON.stringify({ necessary: true, analytics: true }));
  }

  it("exports trackEvent as a function", () => {
    expect(typeof trackEvent).toBe("function");
  });

  it("trackEvent does not throw when analytics unsupported", () => {
    expect(() => trackEvent("test", {})).not.toThrow();
  });

  it("discards events without analytics consent", async () => {
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent: trackEventNoConsent } = await import("../analytics");
    trackEventNoConsent("test_event", {});
    await vi.waitFor(() => expect(mockLogEvent).not.toHaveBeenCalled());

    vi.unstubAllEnvs();
  });

  it("calls logEvent when analytics is supported, consented and in prod", async () => {
    grantConsent();
    mockIsSupported.mockResolvedValue(true);
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent: trackEventProd } = await import("../analytics");
    // Analytics se inicializa de forma diferida al primer evento.
    trackEventProd("test_event", { key: "value" });
    await vi.waitFor(() =>
      expect(mockLogEvent).toHaveBeenCalledWith(expect.any(Object), "test_event", { key: "value" }),
    );

    vi.unstubAllEnvs();
  });

  it("does not initialize analytics in prod without a measurement id", async () => {
    grantConsent();
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "");

    const { trackEvent: trackEventNoId } = await import("../analytics");
    trackEventNoId("test_event", {});
    await vi.waitFor(() => expect(mockLogEvent).not.toHaveBeenCalled());

    vi.unstubAllEnvs();
  });

  it("does not initialize analytics when unsupported even in prod", async () => {
    grantConsent();
    mockIsSupported.mockResolvedValue(false);
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent: trackEventUnsupported } = await import("../analytics");
    trackEventUnsupported("test_event", {});
    await vi.waitFor(() => expect(mockLogEvent).not.toHaveBeenCalled());

    vi.unstubAllEnvs();
  });

  it("grantAnalyticsConsent enables tracking after the consent decision", async () => {
    mockIsSupported.mockResolvedValue(true);
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent: trackAfter, grantAnalyticsConsent } = await import("../analytics");
    // Sin consentimiento: el evento se descarta.
    trackAfter("early_event", {});
    await vi.waitFor(() => expect(mockLogEvent).not.toHaveBeenCalled());

    // El usuario acepta: los siguientes eventos sí se registran.
    grantConsent();
    grantAnalyticsConsent();
    trackAfter("late_event", { x: 1 });
    await vi.waitFor(() => expect(mockLogEvent).toHaveBeenCalledWith(expect.any(Object), "late_event", { x: 1 }));

    vi.unstubAllEnvs();
  });

  it("grantAnalyticsConsent is a no-op without consent", async () => {
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { grantAnalyticsConsent } = await import("../analytics");
    // Sin consentimiento la función no hace nada (y no inicializa analytics).
    grantAnalyticsConsent();
    await vi.waitFor(() => expect(mockLogEvent).not.toHaveBeenCalled());

    vi.unstubAllEnvs();
  });

  it("initializes analytics only once for repeated events", async () => {
    grantConsent();
    mockIsSupported.mockResolvedValue(true);
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent: trackTwice } = await import("../analytics");
    trackTwice("first", {});
    await vi.waitFor(() => {
      expect(mockLogEvent).toHaveBeenCalledWith(expect.any(Object), "first", {});
    });
    // Segundo evento: la instancia ya está inicializada (memoizada).
    trackTwice("second", {});
    await vi.waitFor(() => {
      expect(mockLogEvent).toHaveBeenCalledWith(expect.any(Object), "second", {});
    });

    vi.unstubAllEnvs();
  });

  it("does not log when analytics is not supported", async () => {
    grantConsent();
    mockIsSupported.mockResolvedValue(false);
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent: trackUnsupported } = await import("../analytics");
    trackUnsupported("event", {});
    await vi.waitFor(() => {
      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    vi.unstubAllEnvs();
  });

  it("buffers web_vital events before consent and flushes them after", async () => {
    mockIsSupported.mockResolvedValue(true);
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent, grantAnalyticsConsent } = await import("../analytics");
    // Sin consentimiento: el evento de métrica se bufferiza (no se descarta).
    trackEvent("web_vital", { metric_name: "LCP" });
    await vi.waitFor(() => expect(mockLogEvent).not.toHaveBeenCalled());

    // Al aceptar, el evento bufferizado se reenvía.
    grantConsent();
    grantAnalyticsConsent();
    await vi.waitFor(() => {
      expect(mockLogEvent).toHaveBeenCalledWith(expect.any(Object), "web_vital", { metric_name: "LCP" });
    });

    vi.unstubAllEnvs();
  });

  it("does not buffer interactive events before consent", async () => {
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent, grantAnalyticsConsent } = await import("../analytics");
    trackEvent("rsvp_submit", { attendance: "yes" });
    // El evento interactivo no se bufferiza.
    grantConsent();
    grantAnalyticsConsent();
    await vi.waitFor(() => expect(mockLogEvent).not.toHaveBeenCalled());

    vi.unstubAllEnvs();
  });
});
