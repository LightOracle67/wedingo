import { describe, it, expect } from "vitest";
import {
  isValidGoogleMapsUrl, convertToEmbedUrl, extractPlaceNameFromUrl,
} from "../geo-utils";

describe("isValidGoogleMapsUrl", () => {
  it("accepts google.com/maps/place URLs", () => {
    expect(isValidGoogleMapsUrl("https://www.google.com/maps/place/Madrid")).toBe(true);
    expect(isValidGoogleMapsUrl("https://www.google.com/maps/place/Plaza+Mayor/@40.4153,-3.7074,17z")).toBe(true);
    expect(isValidGoogleMapsUrl("https://maps.google.com/maps/place/Madrid")).toBe(true);
    expect(isValidGoogleMapsUrl("https://www.google.es/maps/place/Plaza+Mayor/@40.41,-3.70,17z/data=!3m1!4b1")).toBe(true);
  });

  it("rejects query/coordinate URLs (not place links)", () => {
    expect(isValidGoogleMapsUrl("https://www.google.com/maps?q=40.41,-3.70")).toBe(false);
    expect(isValidGoogleMapsUrl("https://google.com/maps?ll=40.41,-3.70")).toBe(false);
    expect(isValidGoogleMapsUrl("https://www.google.com/maps/search/?api=1&query=Madrid")).toBe(false);
  });

  it("rejects short links", () => {
    expect(isValidGoogleMapsUrl("https://maps.app.goo.gl/iiHSrkxG1WuVepLu6")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isValidGoogleMapsUrl("")).toBe(false);
    expect(isValidGoogleMapsUrl("https://example.com/maps")).toBe(false);
    expect(isValidGoogleMapsUrl("https://www.google.com/maps/place/")).toBe(false);
    expect(isValidGoogleMapsUrl("not-a-url")).toBe(false);
  });
});

describe("convertToEmbedUrl", () => {
  it("returns URL as-is when already embed", () => {
    const url = "https://maps.google.com/maps?q=Madrid&hl=es&z=14&output=embed";
    expect(convertToEmbedUrl(url)).toBe(url);
  });

  it("converts place path URLs", () => {
    const result = convertToEmbedUrl("https://www.google.com/maps/place/Plaza+Mayor/@40.4153,-3.7074,17z");
    expect(result).toContain("output=embed");
    expect(result).toContain("q=Plaza%20Mayor");
  });

  it("converts URL with q param", () => {
    const result = convertToEmbedUrl("https://www.google.com/maps/search/?api=1&query=Madrid");
    expect(result).toContain("output=embed");
    expect(result).toContain("q=Madrid");
  });

  it("converts URL with ll param", () => {
    const result = convertToEmbedUrl("https://www.google.com/maps?ll=40.4168,-3.7038");
    expect(result).toContain("output=embed");
    expect(result).toContain("40.4168");
  });

  it("returns URL as-is on parse failure", () => {
    expect(convertToEmbedUrl("not-a-url")).toBe("not-a-url");
  });
});

describe("extractPlaceNameFromUrl", () => {
  it("recovers name from /maps/place/ path", () => {
    const name = extractPlaceNameFromUrl("https://www.google.com/maps/place/La+Mas%C3%ADa+de+L%C3%B3pez/@40.4,-3.7,15z");
    expect(name).toBe("La Masía de López");
  });

  it("recovers name from /maps/place/ path without coordinates", () => {
    const name = extractPlaceNameFromUrl("https://www.google.com/maps/place/Hacienda+Los+Olivos");
    expect(name).toBe("Hacienda Los Olivos");
  });

  it("returns null for non-place URLs (q param)", () => {
    expect(extractPlaceNameFromUrl("https://www.google.com/maps/search/?api=1&query=Iglesia%20San%20Jos%C3%A9")).toBeNull();
    expect(extractPlaceNameFromUrl("https://www.google.com/maps?q=Hacienda+Los+Olivos")).toBeNull();
  });

  it("returns null when the query is only coordinates", () => {
    expect(extractPlaceNameFromUrl("https://www.google.com/maps?q=40.4168,-3.7038")).toBeNull();
  });

  it("returns null for short links", () => {
    expect(extractPlaceNameFromUrl("https://maps.app.goo.gl/iiHSrkxG1WuVepLu6")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(extractPlaceNameFromUrl("not-a-url")).toBeNull();
    expect(extractPlaceNameFromUrl("")).toBeNull();
  });

  it("returns null when no name can be found", () => {
    expect(extractPlaceNameFromUrl("https://www.google.com/maps?ll=40.4168,-3.7038")).toBeNull();
  });
});
