import { describe, it, expect, vi } from "vitest";

const mockTrackEvent = vi.hoisted(() => vi.fn());
const mockOnCLS = vi.hoisted(() => vi.fn());
const mockOnFCP = vi.hoisted(() => vi.fn());
const mockOnINP = vi.hoisted(() => vi.fn());
const mockOnLCP = vi.hoisted(() => vi.fn());
const mockOnTTFB = vi.hoisted(() => vi.fn());

vi.mock("web-vitals", () => ({
  onCLS: mockOnCLS,
  onFCP: mockOnFCP,
  onINP: mockOnINP,
  onLCP: mockOnLCP,
  onTTFB: mockOnTTFB,
}));

vi.mock("../analytics", () => ({
  trackEvent: mockTrackEvent,
}));

describe("reportWebVitals", () => {
  it("exists and does not throw when called in non-PROD mode", async () => {
    const { reportWebVitals } = await import("../vitals");
    expect(typeof reportWebVitals).toBe("function");
    expect(() => reportWebVitals()).not.toThrow();
  });

  it("returns early in non-PROD mode", async () => {
    vi.stubEnv("PROD", false);
    const { reportWebVitals } = await import("../vitals");
    expect(() => reportWebVitals()).not.toThrow();
    vi.unstubAllEnvs();
  });

  it("registers all Core Web Vital handlers in PROD", async () => {
    vi.resetModules();
    vi.stubEnv("PROD", true);
    const { reportWebVitals } = await import("../vitals");
    reportWebVitals();
    expect(mockOnCLS).toHaveBeenCalledTimes(1);
    expect(mockOnFCP).toHaveBeenCalledTimes(1);
    expect(mockOnINP).toHaveBeenCalledTimes(1);
    expect(mockOnLCP).toHaveBeenCalledTimes(1);
    expect(mockOnTTFB).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it("reports web_vital events and keeps CLS with 4 decimals", async () => {
    vi.resetModules();
    vi.stubEnv("PROD", true);
    const { reportWebVitals } = await import("../vitals");
    reportWebVitals();

    // Extrae el callback registrado por onCLS y lo invoca con un CLS pequeño.
    const clsCallback = mockOnCLS.mock.calls[0]![0];
    clsCallback({ name: "CLS", value: 0.0452, rating: "good" });
    await vi.waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("web_vital", {
        metric_name: "CLS",
        value: 0.045,
        rating: "good",
      });
    });

    // Una métrica en ms se redondea a entero.
    const lcpCallback = mockOnLCP.mock.calls[0]![0];
    lcpCallback({ name: "LCP", value: 1234.6, rating: "good" });
    await vi.waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("web_vital", {
        metric_name: "LCP",
        value: 1235,
        rating: "good",
      });
    });
    vi.unstubAllEnvs();
  });
});
