export const geocodeLocation = async (place: string) => {
  if (!place) return null;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(place)}`,
    { headers: { Accept: "application/json", "User-Agent": "Wedingo/1.0 (adriancl2001@gmail.com)" } },
  );
  if (!response.ok) return null;
  const results = await response.json();
  const firstResult = Array.isArray(results) ? results[0] : null;
  if (!firstResult) return null;
  const latitude = Number.parseFloat(firstResult.lat);
  const longitude = Number.parseFloat(firstResult.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude, label: firstResult.display_name || place };
};

export const parseCoordinate = (value: string | number | null | undefined) => {
  if (typeof value !== "string") return null;
  const normalizedValue = value.trim().replace(/,/g, ".");
  if (!normalizedValue) return null;
  const parsedValue = Number.parseFloat(normalizedValue);
  if (!Number.isFinite(parsedValue)) return null;
  return parsedValue;
};

export const searchLocations = async (query: string) => {
  if (!query || query.length < 3) return [];
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json", "User-Agent": "Wedingo/1.0 (adriancl2001@gmail.com)" } },
  );
  if (!response.ok) return [];
  const results = await response.json();
  if (!Array.isArray(results)) return [];
  return results
    .filter((r) => r.lat && r.lon)
    .map((r) => ({
      label: r.display_name || query,
      latitude: r.lat,
      longitude: r.lon,
    }));
};

export const getValidCoordinates = (latitudeValue: string | null, longitudeValue: string | null) => {
  const latitude = parseCoordinate(latitudeValue);
  const longitude = parseCoordinate(longitudeValue);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

export const resolveLocationTarget = async ({ place, latitudeValue, longitudeValue }: { place: string; latitudeValue: string; longitudeValue: string }) => {
  const exactCoordinates = getValidCoordinates(latitudeValue, longitudeValue);
  if (exactCoordinates) {
    return { ...exactCoordinates, label: place || "Ubicación configurada" };
  }
  return geocodeLocation(place);
};

export const buildGoogleMapsUrl = (location: { latitude: number; longitude: number }) =>
  `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

export const buildGoogleMapsEmbedUrl = (location: { latitude: number; longitude: number }, language = "es") =>
  `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&hl=${language}&z=14&output=embed`;

export const buildGoogleMapsEmbedSearchUrl = (place: string, language = "es") =>
  `https://maps.google.com/maps?q=${encodeURIComponent(place)}&hl=${language}&z=14&output=embed`;

const GOOGLE_MAPS_URL_PATTERN = /^https:\/\/(www\.)?google\.(com|[a-z]{2,3})\/maps\/.+$/;
const GOOGL_URL_PATTERN = /^https:\/\/maps\.app\.goo\.gl\/[a-zA-Z0-9_-]+$/;

export function isValidGoogleMapsUrl(url: string): boolean {
  const trimmed = url.trim();
  return GOOGLE_MAPS_URL_PATTERN.test(trimmed) || GOOGL_URL_PATTERN.test(trimmed);
}

export function convertToEmbedUrl(mapUrl: string): string {
  const url = mapUrl.trim();
  // Already an embed URL or a goo.gl short link (can't convert, skip embed)
  if (url.includes('output=embed') || GOOGL_URL_PATTERN.test(url)) return url;
  // Convert a standard Google Maps URL to embed
  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get('q') || '';
    const ll = parsed.searchParams.get('ll') || '';
    const query = q || ll || parsed.pathname.replace(/^\/maps\/place\//, '').replace(/\/.+$/, '');
    const encoded = encodeURIComponent(query.replace(/\+/g, ' '));
    return `https://maps.google.com/maps?q=${encoded}&hl=es&z=14&output=embed`;
  } catch {
    return url;
  }
}

export const buildGoogleMapsSearchUrl = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

export const buildAppleMapsUrl = (location: { latitude: number; longitude: number; label?: string }, placeLabel?: string) => {
  const label = encodeURIComponent(placeLabel || location.label || "Boda");
  return `https://maps.apple.com/?ll=${location.latitude},${location.longitude}&q=${label}`;
};

export const buildAppleMapsSearchUrl = (place: string) =>
  `https://maps.apple.com/?q=${encodeURIComponent(place)}`;
