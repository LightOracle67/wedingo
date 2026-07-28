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
});
