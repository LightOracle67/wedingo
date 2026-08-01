import { describe, it, expect } from "vitest";
import {
  isValidGoogleMapsUrl, convertToEmbedUrl, extractPlaceNameFromUrl,
} from "../geo-utils";

describe("isValidGoogleMapsUrl", () => {
  it("accepts standard google.com/maps URLs", () => {
    expect(isValidGoogleMapsUrl("https://www.google.com/maps/place/Madrid")).toBe(true);
    expect(isValidGoogleMapsUrl("https://google.com/maps?q=40.41,-3.70")).toBe(true);
  });

  it("accepts maps.app.goo.gl short links", () => {
    expect(isValidGoogleMapsUrl("https://maps.app.goo.gl/iiHSrkxG1WuVepLu6")).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(isValidGoogleMapsUrl("")).toBe(false);
    expect(isValidGoogleMapsUrl("https://example.com/maps")).toBe(false);
    expect(isValidGoogleMapsUrl("https://maps.app.goo.gl/")).toBe(false);
    expect(isValidGoogleMapsUrl("not-a-url")).toBe(false);
    expect(isValidGoogleMapsUrl("http://maps.google.com/maps")).toBe(false);
  });
});

describe("convertToEmbedUrl", () => {
  it("returns URL as-is when already embed", () => {
    const url = "https://maps.google.com/maps?q=Madrid&hl=es&z=14&output=embed";
    expect(convertToEmbedUrl(url)).toBe(url);
  });

  it("returns goo.gl short links as-is", () => {
    const url = "https://maps.app.goo.gl/iiHSrkxG1WuVepLu6";
    expect(convertToEmbedUrl(url)).toBe(url);
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

  it("converts place path URLs", () => {
    const result = convertToEmbedUrl("https://www.google.com/maps/place/Madrid");
    expect(result).toContain("output=embed");
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

  it("recovers name from q param", () => {
    const name = extractPlaceNameFromUrl("https://www.google.com/maps/search/?api=1&query=Iglesia%20San%20Jos%C3%A9");
    expect(name).toBe("Iglesia San José");
  });

  it("recovers name from q param with plus signs", () => {
    const name = extractPlaceNameFromUrl("https://www.google.com/maps?q=Hacienda+Los+Olivos");
    expect(name).toBe("Hacienda Los Olivos");
  });

  it("returns null when the query is only coordinates", () => {
    expect(extractPlaceNameFromUrl("https://www.google.com/maps?q=40.4168,-3.7038")).toBeNull();
  });

  it("returns null for goo.gl short links", () => {
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
