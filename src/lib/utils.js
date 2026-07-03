import { STORY_SECTION_ORDER, THEME_VALUES } from "./constants";

export const normalizeConfig = (value) => ({
  adminUsername:
    typeof value?.adminUsername === "string" ? value.adminUsername.trim().toLowerCase() : "",
  firstName: typeof value?.firstName === "string" ? value.firstName.trim() : "",
  secondName: typeof value?.secondName === "string" ? value.secondName.trim() : "",
  inviteMessage: typeof value?.inviteMessage === "string" ? value.inviteMessage.trim() : "",
  weddingPlace: typeof value?.weddingPlace === "string" ? value.weddingPlace.trim() : "",
  weddingLatitude: typeof value?.weddingLatitude === "string" ? value.weddingLatitude.trim() : "",
  weddingLongitude: typeof value?.weddingLongitude === "string" ? value.weddingLongitude.trim() : "",
  weddingDay: typeof value?.weddingDay === "string" ? value.weddingDay.trim() : "",
  weddingMonth: typeof value?.weddingMonth === "string" ? value.weddingMonth.trim() : "",
  weddingYear: typeof value?.weddingYear === "string" ? value.weddingYear.trim() : "",
  weddingHour: typeof value?.weddingHour === "string" ? value.weddingHour.trim() : "",
  weddingMinute: typeof value?.weddingMinute === "string" ? value.weddingMinute.trim() : "",
  weddingSchedule: typeof value?.weddingSchedule === "string" ? value.weddingSchedule.trim() : "",
  weddingDressCode: typeof value?.weddingDressCode === "string" ? value.weddingDressCode.trim() : "",
  theme:
    typeof value?.theme === "string" && THEME_VALUES.has(value.theme.trim())
      ? value.theme.trim()
      : "golden",
  backgroundImage: typeof value?.backgroundImage === "string" ? value.backgroundImage.trim() : "",
  backgroundImageLabel:
    typeof value?.backgroundImageLabel === "string" ? value.backgroundImageLabel.trim() : "",
  backgroundImageSource:
    typeof value?.backgroundImageSource === "string" ? value.backgroundImageSource.trim() : "",
  sectionOrder:
    typeof value?.sectionOrder === "string" ? value.sectionOrder.trim() : STORY_SECTION_ORDER.join(","),
  hiddenSections:
    typeof value?.hiddenSections === "string" ? value.hiddenSections.trim() : "",
  storyText:
    typeof value?.storyText === "string" ? value.storyText.trim() : "",
  giftsInfo:
    typeof value?.giftsInfo === "string" ? value.giftsInfo.trim() : "",
  accommodationInfo:
    typeof value?.accommodationInfo === "string" ? value.accommodationInfo.trim() : "",
  kidsPolicy:
    typeof value?.kidsPolicy === "string" ? value.kidsPolicy.trim() : "",
});

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
  const normalizedValue = value.trim().replace(",", ".");
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
    return { ...exactCoordinates, label: place || "Ubicacion configurada" };
  }
  return geocodeLocation(place);
};

export const buildGoogleMapsUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

export const buildAppleMapsUrl = (location, placeLabel) => {
  const label = encodeURIComponent(placeLabel || location.label || "Boda");
  return `https://maps.apple.com/?ll=${location.latitude},${location.longitude}&q=${label}`;
};

const padDatePart = (value) => String(value).padStart(2, "0");

const formatCalendarDateTime = (date) =>
  `${date.getFullYear()}${padDatePart(date.getMonth() + 1)}${padDatePart(date.getDate())}T${padDatePart(date.getHours())}${padDatePart(date.getMinutes())}00`;

export const buildGoogleCalendarUrl = ({ title, description, place, startDate, endDate }) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location: place,
    dates: `${formatCalendarDateTime(startDate)}/${formatCalendarDateTime(endDate)}`,
    ctz: timezone,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const generateSetupToken = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const alphabetLen = alphabet.length;
  const maxValid = 256 - (256 % alphabetLen);
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const rawToken = Array.from(bytes, (byte) => alphabet[byte < maxValid ? byte % alphabetLen : 0]).join("");
  return rawToken.match(/.{1,4}/g)?.join("-") ?? rawToken;
};

export const normalizeTokenValue = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const MAX_IMAGE_DIMENSION = 1600;
const TARGET_BYTES = 500 * 1024;

export const compressImage = (file) =>
  new Promise((resolve, reject) => {
    if (file.size <= TARGET_BYTES && file.type === "image/jpeg") {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No se pudo procesar la imagen")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryQuality = () => {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const estimatedBytes = Math.round((dataUrl.length * 3) / 4);
        if (estimatedBytes <= TARGET_BYTES || quality <= 0.2) {
          resolve(dataUrl);
        } else {
          quality -= 0.1;
          tryQuality();
        }
      };
      tryQuality();
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(file);
  });

const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const buildOpenFreeMapPreviewUrl = async (location, _style) => {
  if (!location) return "";

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "-10000px";
  container.style.width = "1200px";
  container.style.height = "800px";
  document.body.appendChild(container);

  try {
    const maplibregl = (await import("maplibre-gl")).default;
    const map = new maplibregl.Map({
      container,
      style: OPEN_FREE_MAP_STYLE,
      center: [location.longitude, location.latitude],
      zoom: 15,
      bearing: -12,
      pitch: 40,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });

    const markerElement = document.createElement("div");
    markerElement.style.width = "18px";
    markerElement.style.height = "18px";
    markerElement.style.borderRadius = "999px";
    markerElement.style.background = "#d8b24a";
    markerElement.style.border = "3px solid rgba(255, 255, 255, 0.95)";
    markerElement.style.boxShadow = "0 0 0 8px rgba(216, 178, 74, 0.18)";

    new maplibregl.Marker({ element: markerElement, anchor: "center" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);

    await new Promise((resolve, reject) => {
      map.once("error", reject);
      map.once("idle", resolve);
    });

    const previewUrl = map.getCanvas().toDataURL("image/png");
    map.remove();
    return previewUrl;
  } finally {
    container.remove();
  }
};

const INVITE_KEY_MAP = {
  fn: "firstName", sn: "secondName", im: "inviteMessage",
  wp: "weddingPlace", la: "weddingLatitude", lo: "weddingLongitude",
  dd: "weddingDay", mm: "weddingMonth", yy: "weddingYear",
  hh: "weddingHour", mi: "weddingMinute",
  sc: "weddingSchedule", dc: "weddingDressCode",
  th: "theme", so: "sectionOrder", hs: "hiddenSections",
  st: "storyText", gi: "giftsInfo",
  ai: "accommodationInfo", kp: "kidsPolicy",
};

const INVITE_KEY_REV = Object.fromEntries(
  Object.entries(INVITE_KEY_MAP).map(([k, v]) => [v, k]),
);

function toBase64Url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const padded = str.length % 4 === 3 ? str + "=" : str.length % 4 === 2 ? str + "==" : str;
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

export function encodeInviteConfig(config) {
  const { backgroundImage, backgroundImageLabel, backgroundImageSource, adminUsername, ...rest } = config;
  const compact = {};
  for (const [key, val] of Object.entries(rest)) {
    const short = INVITE_KEY_REV[key];
    compact[short || key] = val;
  }
  for (const k of Object.keys(compact)) {
    if (compact[k] === "" || compact[k] === null || compact[k] === undefined) {
      delete compact[k];
    }
  }
  return toBase64Url(JSON.stringify(compact));
}

export function decodeInviteConfig(hash) {
  const raw = fromBase64Url(hash);
  const compact = JSON.parse(raw);
  const expanded = {};
  for (const [key, val] of Object.entries(compact)) {
    const long = INVITE_KEY_MAP[key] || key;
    expanded[long] = val;
  }
  return expanded;
}
