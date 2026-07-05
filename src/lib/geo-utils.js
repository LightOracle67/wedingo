export const geocodeLocation = async (place) => {
  if (!place) return null;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(place)}`,
    { headers: { Accept: "application/json" } },
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

export const parseCoordinate = (value) => {
  if (typeof value !== "string") return null;
  const normalizedValue = value.trim().replace(/,/g, ".");
  if (!normalizedValue) return null;
  const parsedValue = Number.parseFloat(normalizedValue);
  if (!Number.isFinite(parsedValue)) return null;
  return parsedValue;
};

export const getValidCoordinates = (latitudeValue, longitudeValue) => {
  const latitude = parseCoordinate(latitudeValue);
  const longitude = parseCoordinate(longitudeValue);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

export const resolveLocationTarget = async ({ place, latitudeValue, longitudeValue }) => {
  const exactCoordinates = getValidCoordinates(latitudeValue, longitudeValue);
  if (exactCoordinates) {
    return { ...exactCoordinates, label: place || "Ubicación configurada" };
  }
  return geocodeLocation(place);
};

export const buildGoogleMapsUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

export const buildAppleMapsUrl = (location, placeLabel) => {
  const label = encodeURIComponent(placeLabel || location.label || "Boda");
  return `https://maps.apple.com/?ll=${location.latitude},${location.longitude}&q=${label}`;
};
