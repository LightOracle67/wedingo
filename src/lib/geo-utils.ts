const GOOGLE_MAPS_PLACE_PATTERN = /^https:\/\/((www|maps)\.)?google\.(com|[a-z]{2,3})\/maps\/place\/.+$/;

export function isValidGoogleMapsUrl(url: string): boolean {
  return GOOGLE_MAPS_PLACE_PATTERN.test(url.trim());
}

const MAP_VIEW_TILES: Record<string, string> = { roadmap: "m", satellite: "k", hybrid: "h" };

export function convertToEmbedUrl(mapUrl: string, view: string = "roadmap", lang: string = "es"): string {
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
    const tile = MAP_VIEW_TILES[view] || 'm';
    // hl usa el idioma de la app para localizar el mapa del invitado.
    const hl = ((lang || "es").split("-")[0] || "es").toLowerCase();
    return `https://maps.google.com/maps?q=${encoded}&hl=${hl}&z=14&t=${tile}&output=embed`;
  } catch {
    return url;
  }
}

const COORDINATES_ONLY_PATTERN = /^[-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?$/;

/** Cache del nombre del lugar por URL: GuestsSectionForm/TransportSectionForm
 *  la llaman varias veces por render en el mismo valor; el parseo de URL
 *  (new URL + decodeURIComponent) no merece repetirse. Límite conservador
 *  para no crecer sin control. */
const placeNameCache = new Map<string, string | null>();
const PLACE_NAME_CACHE_MAX = 200;

export function extractPlaceNameFromUrl(mapUrl: string): string | null {
  const url = mapUrl.trim();
  const cached = placeNameCache.get(url);
  if (cached !== undefined) return cached;
  let result: string | null = null;
  if (isValidGoogleMapsUrl(url)) {
    try {
      const parsed = new URL(url);
      const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || '';
      if (q && !COORDINATES_ONLY_PATTERN.test(q.trim())) {
        result = decodeURIComponent(q.replace(/\+/g, ' ')).trim() || null;
      } else {
        const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/@]+)/);
        if (placeMatch && placeMatch[1]) {
          result = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim() || null;
        }
      }
    } catch { result = null; }
  }
  if (placeNameCache.size >= PLACE_NAME_CACHE_MAX) placeNameCache.clear();
  placeNameCache.set(url, result);
  return result;
}
