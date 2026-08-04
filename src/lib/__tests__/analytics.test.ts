import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLogEvent = vi.hoisted(() => vi.fn());
const mockGetAnalytics = vi.hoisted(() => vi.fn(() => ({})));
const mockIsSupported = vi.hoisted(() => vi.fn(() => Promise.resolve(false)));

vi.mock("firebase/analytics", () => ({
  getAnalytics: mockGetAnalytics,
  logEvent: mockLogEvent,
  isSupported: mockIsSupported,
}));

import { trackEvent } from "../analytics";

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports trackEvent as a function", () => {
    expect(typeof trackEvent).toBe("function");
  });

  it("trackEvent does not throw when analytics unsupported", () => {
    expect(() => trackEvent("test", {})).not.toThrow();
  });

  it("calls logEvent when analytics is supported and in prod", async () => {
    mockIsSupported.mockResolvedValue(true);
    vi.resetModules();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-XXXXXXXX");

    const { trackEvent: trackEventProd } = await import("../analytics");
    // Analytics se inicializa de forma diferida al primer evento.
    trackEventProd("test_event", { key: "value" });
    await vi.waitFor(() => expect(mockLogEvent).toHaveBeenCalledWith(expect.any(Object), "test_event", { key: "value" }));

    vi.unstubAllEnvs();
  });
});
