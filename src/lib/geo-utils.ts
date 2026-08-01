const GOOGLE_MAPS_URL_PATTERN = /^https:\/\/(www\.)?google\.(com|[a-z]{2,3})\/maps(\/|\?|$).+/;
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
    const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || '';
    const ll = parsed.searchParams.get('ll') || '';
    const query = q || ll || parsed.pathname.replace(/^\/maps\/place\//, '').replace(/\/.+$/, '');
    const encoded = encodeURIComponent(query.replace(/\+/g, ' '));
    return `https://maps.google.com/maps?q=${encoded}&hl=es&z=14&output=embed`;
  } catch {
    return url;
  }
}

const COORDINATES_ONLY_PATTERN = /^[-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?$/;

export function extractPlaceNameFromUrl(mapUrl: string): string | null {
  const url = mapUrl.trim();
  if (!isValidGoogleMapsUrl(url) || GOOGL_URL_PATTERN.test(url)) return null;
  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || '';
    if (q && !COORDINATES_ONLY_PATTERN.test(q.trim())) {
      return decodeURIComponent(q.replace(/\+/g, ' ')).trim() || null;
    }
    const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch && placeMatch[1]) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim() || null;
    }
    return null;
  } catch {
    return null;
  }
}
