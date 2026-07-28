import { describe, it, expect, vi } from "vitest";
import {
  parseCoordinate, getValidCoordinates,
  buildGoogleMapsUrl, buildGoogleMapsSearchUrl,
  buildAppleMapsUrl, buildAppleMapsSearchUrl,
  geocodeLocation, searchLocations, resolveLocationTarget,
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

  it("uses 'Boda' as fallback when no label is provided", () => {
    const url = buildAppleMapsUrl({ latitude: 40.4168, longitude: -3.7038 });
    expect(url).toContain(encodeURIComponent("Boda"));
  });

  it("builds Apple Maps search URL", () => {
    const url = buildAppleMapsSearchUrl("Iglesia San José");
    expect(url).toContain("https://maps.apple.com/?q=");
    expect(url).toContain(encodeURIComponent("Iglesia San José"));
  });
});

describe("geocodeLocation", () => {
  it("returns null for empty place", async () => {
    const result = await geocodeLocation("");
    expect(result).toBeNull();
  });

  it("throws on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    await expect(geocodeLocation("Madrid")).rejects.toThrow("Network error");
  });

  it("returns null when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false } as Response);
    const result = await geocodeLocation("Madrid");
    expect(result).toBeNull();
  });

  it("returns null when no results found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);
    const result = await geocodeLocation("Nowhere");
    expect(result).toBeNull();
  });

  it("returns null when coordinate parsing fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ lat: "not-a-number", lon: "not-a-number", display_name: "Invalid" }]),
    } as Response);
    const result = await geocodeLocation("Invalid");
    expect(result).toBeNull();
  });

  it("returns null when response is not an array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: "not an array" }),
    } as Response);
    const result = await geocodeLocation("Error");
    expect(result).toBeNull();
  });

  it("falls back to place label when display_name is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ lat: "40.4168", lon: "-3.7038", display_name: null }]),
    } as Response);
    const result = await geocodeLocation("My Place");
    expect(result).toEqual({ latitude: 40.4168, longitude: -3.7038, label: "My Place" });
  });
});

describe("searchLocations", () => {
  it("returns empty array for short query", async () => {
    const result = await searchLocations("ab");
    expect(result).toEqual([]);
  });

  it("throws on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    await expect(searchLocations("Madrid")).rejects.toThrow("Network error");
  });

  it("returns empty array when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false } as Response);
    const result = await searchLocations("Madrid");
    expect(result).toEqual([]);
  });

  it("returns empty array when results is not an array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    } as Response);
    const result = await searchLocations("Madrid");
    expect(result).toEqual([]);
  });
});

describe("resolveLocationTarget", () => {
  it("uses exact coordinates when valid", async () => {
    const result = await resolveLocationTarget({ place: "Home", latitudeValue: "40.4168", longitudeValue: "-3.7038" });
    expect(result).toEqual({ latitude: 40.4168, longitude: -3.7038, label: "Home" });
  });

  it("uses default label when place is empty with valid coordinates", async () => {
    const result = await resolveLocationTarget({ place: "", latitudeValue: "40.4168", longitudeValue: "-3.7038" });
    expect(result).toEqual({ latitude: 40.4168, longitude: -3.7038, label: "Ubicación configurada" });
  });

  it("falls back to geocodeLocation when coordinates are invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ lat: "41.3874", lon: "2.1686", display_name: "Barcelona" }]),
    } as Response);
    const result = await resolveLocationTarget({ place: "Barcelona", latitudeValue: "", longitudeValue: "" });
    expect(result).toEqual({ latitude: 41.3874, longitude: 2.1686, label: "Barcelona" });
  });
});

describe("searchLocations with results", () => {
  it("maps search results to locations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { lat: "40.4168", lon: "-3.7038", display_name: "Madrid, Spain" },
        { lat: "41.3851", lon: "2.1734", display_name: "Barcelona, Spain" },
      ]),
    } as Response);
    const results = await searchLocations("Madrid");
    expect(results).toHaveLength(2);
    expect(results[0].latitude).toBe("40.4168");
    expect(results[0].label).toBe("Madrid, Spain");
  });

  it("filters out results without coordinates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { lat: "40.4168", lon: "-3.7038", display_name: "Madrid" },
        { lat: null, lon: null, display_name: "Nowhere" },
      ]),
    } as Response);
    const results = await searchLocations("Madrid");
    expect(results).toHaveLength(1);
  });

  it("falls back to query for label when display_name is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { lat: "40.4168", lon: "-3.7038", display_name: null },
      ]),
    } as Response);
    const results = await searchLocations("Madrid");
    expect(results[0].label).toBe("Madrid");
  });
});
