import { describe, it, expect } from "vitest";
import {
  parseCoordinate, getValidCoordinates,
  buildGoogleMapsUrl, buildGoogleMapsSearchUrl,
  buildAppleMapsUrl, buildAppleMapsSearchUrl,
} from "../geo-utils";

describe("parseCoordinate", () => {
  it("returns null for non-string input", () => {
    expect(parseCoordinate(null)).toBeNull();
    expect(parseCoordinate(undefined)).toBeNull();
    expect(parseCoordinate(40.5)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("  ")).toBeNull();
  });

  it("replaces comma with dot (European format)", () => {
    expect(parseCoordinate("40,5")).toBe(40.5);
    expect(parseCoordinate("40,123456")).toBe(40.123456);
  });

  it("returns null for non-numeric string", () => {
    expect(parseCoordinate("abc")).toBeNull();
  });

  it("parses valid coordinate strings", () => {
    expect(parseCoordinate("40.4168")).toBe(40.4168);
    expect(parseCoordinate("-3.7038")).toBe(-3.7038);
  });

  it("trims whitespace", () => {
    expect(parseCoordinate("  40.4168  ")).toBe(40.4168);
  });
});

describe("getValidCoordinates", () => {
  it("returns null for invalid input", () => {
    expect(getValidCoordinates(null, null)).toBeNull();
    expect(getValidCoordinates("abc", "def")).toBeNull();
  });

  it("returns coordinates for valid lat/lng", () => {
    expect(getValidCoordinates("40.4168", "-3.7038")).toEqual({ latitude: 40.4168, longitude: -3.7038 });
  });

  it("returns null for out-of-range latitude", () => {
    expect(getValidCoordinates("100", "0")).toBeNull();
    expect(getValidCoordinates("-100", "0")).toBeNull();
  });

  it("returns null for out-of-range longitude", () => {
    expect(getValidCoordinates("0", "200")).toBeNull();
    expect(getValidCoordinates("0", "-200")).toBeNull();
  });

  it("returns null for out-of-range both", () => {
    expect(getValidCoordinates("100", "200")).toBeNull();
  });

  it("handles European comma format", () => {
    expect(getValidCoordinates("40,5", "-3,7")).toEqual({ latitude: 40.5, longitude: -3.7 });
  });
});

describe("URL builders", () => {
  const location = { latitude: 40.4168, longitude: -3.7038, label: "Madrid" };

  it("builds Google Maps URL with coordinates", () => {
    const url = buildGoogleMapsUrl(location);
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=40.4168,-3.7038");
  });

  it("builds Google Maps search URL", () => {
    const url = buildGoogleMapsSearchUrl("Iglesia San José");
    expect(url).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(url).toContain(encodeURIComponent("Iglesia San José"));
  });

  it("builds Apple Maps URL with coordinates and label", () => {
    const url = buildAppleMapsUrl(location, "Boda");
    expect(url).toContain("https://maps.apple.com/");
    expect(url).toContain("ll=40.4168,-3.7038");
    expect(url).toContain(encodeURIComponent("Boda"));
  });

  it("builds Apple Maps URL with default label", () => {
    const url = buildAppleMapsUrl(location, "");
    expect(url).toContain(encodeURIComponent("Madrid"));
  });

  it("builds Apple Maps search URL", () => {
    const url = buildAppleMapsSearchUrl("Iglesia San José");
    expect(url).toContain("https://maps.apple.com/?q=");
    expect(url).toContain(encodeURIComponent("Iglesia San José"));
  });
});
