const GOOGLE_MAPS_PLACE_PATTERN = /^https:\/\/((www|maps)\.)?google\.(com|[a-z]{2,3})\/maps\/place\/.+$/;

export function isValidGoogleMapsUrl(url: string): boolean {
  return GOOGLE_MAPS_PLACE_PATTERN.test(url.trim());
}

export function convertToEmbedUrl(mapUrl: string): string {
  const url = mapUrl.trim();
  // Already an embed URL, return as-is
  if (url.includes('output=embed')) return url;
  // Convert a Google Maps place URL to embed
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
  if (!isValidGoogleMapsUrl(url)) return null;
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
