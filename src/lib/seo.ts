/**
 * seo.ts
 * ─────────────────────────────────────────────────────────────
 * Gestión de metadatos sociales (Open Graph / Twitter) de forma
 * dinámica por invitación.
 *
 * El index.html contiene los metadatos por defecto de la landing;
 * cuando se carga una invitación concreta se sobrescriben con los
 * datos de esa pareja (título, descripción, URL canónica e imagen).
 *
 * @module seo
 */
import { LANGUAGE_GROUPS } from "../i18n/languages";

/** Prefijo base de las URLs públicas del sitio. */
export const SITE_URL = "https://wedingo-6c26a.web.app";

/** Metadatos por defecto usados por la landing (restauran el head). */
const DEFAULT_TITLE = "Wedingo — Invitaciones de boda personalizadas";
const DEFAULT_DESCRIPTION =
  "Crea y comparte invitaciones de boda únicas con RSVP, galería de fotos, mapa interactivo y música.";

/** Atributo que identifica las meta tags gestionadas por este módulo. */
const META_MARKER = "data-wedingo-seo";

// Caché de los elementos meta gestionados (v2.188): applySocialMeta se invoca
// con cada cambio de config y antes se hacía un querySelector de <head> por
// cada etiqueta (~11) en cada llamada, además de escribir atributos aunque el
// contenido no cambiara (generaba registros de mutación innecesarios).
const metaCache = new Map<string, Element>();

const getOrCreateMeta = (attr: "property" | "name", key: string): HTMLMetaElement => {
  const cacheKey = `${attr}:${key}`;
  let el = metaCache.get(cacheKey) as HTMLMetaElement | undefined;
  if (!el) {
    el =
      document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`) ??
      (() => {
        const created = document.createElement("meta");
        created.setAttribute(attr, key);
        document.head.appendChild(created);
        return created;
      })();
    metaCache.set(cacheKey, el);
  }
  return el;
};

/**
 * Crea (o actualiza) una meta tag en <head> con el atributo indicado.
 * Marca la tag con data-wedingo-seo (también al reutilizar una existente de
 * index.html) para que clearSocialMeta la limpie al desmontar.
 */
function upsertMeta(attr: "property" | "name", key: string, content: string) {
  const el = getOrCreateMeta(attr, key);
  // Escritura solo si cambió (o si aún no está marcada como SEO dinámico).
  if (el.getAttribute("content") === content && el.hasAttribute(META_MARKER)) return;
  el.setAttribute(META_MARKER, "true");
  el.setAttribute("content", content);
}

/**
 * Crea (o actualiza) el <link rel="canonical"> del documento.
 */
function upsertCanonical(href: string) {
  let link =
    (metaCache.get("rel:canonical") as HTMLLinkElement | undefined) ??
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
    metaCache.set("rel:canonical", link);
  }
  if (link.getAttribute("href") === href && link.hasAttribute(META_MARKER)) return;
  link.setAttribute(META_MARKER, "true");
  link.setAttribute("href", href);
}

/**
 * Elimina todas las meta tags y el canonical marcados como SEO dinámico.
 * Se usa al desmontar la invitación para restaurar el head por defecto.
 */
export function clearSocialMeta() {
  document.head.querySelectorAll(`[${META_MARKER}]`).forEach((el) => el.remove());
  metaCache.clear();
}

interface SocialMetaInput {
  /** Título de la invitación (p. ej. "Ana & Luis — Wedingo"). */
  title: string;
  /** Descripción corta para el compartido social. */
  description: string;
  /** URL pública de la invitación. */
  url: string;
  /** URL absoluta de la imagen de la pareja (solo si es http/https). */
  image?: string;
  /** Código de idioma (p. ej. "es") para og:locale. */
  locale?: string;
}

/** Imagen social por defecto (banner genérico) cuando la invitación no tiene
 *  una URL absoluta (couplePhoto suele ser un data URI, no indexable). */
const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/og-banner.png`;

/** Mapeo de código de idioma a locale og:locale (lengua_TERRITORIO). */
const LOCALE_MAP: Record<string, string> = {
  es: "es_ES",
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  pt: "pt_PT",
  it: "it_IT",
  nl: "nl_NL",
  ca: "ca_ES",
  gl: "gl_ES",
  eu: "eu_ES",
  pl: "pl_PL",
  ru: "ru_RU",
  ar: "ar_AR",
  he: "he_IL",
  ja: "ja_JP",
  zh: "zh_CN",
  ko: "ko_KR",
  tr: "tr_TR",
};

/**
 * Aplica las meta tags Open Graph y Twitter de la invitación.
 * Si no hay imagen absoluta http(s), se usa una imagen genérica para que
 * WhatsApp/Telegram muestren una vista previa (los data URIs no son
 * indexables por los rastreadores sociales).
 */
export function applySocialMeta({ title, description, url, image, locale }: SocialMetaInput) {
  const absoluteImage = image && /^https?:\/\//.test(image) ? image : DEFAULT_SOCIAL_IMAGE;

  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:site_name", "Wedingo");
  upsertMeta("property", "og:type", "website");
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  if (locale) {
    // og:locale exige "lengua_TERRITORIO" (p. ej. es_ES), no solo el código.
    // "pt-BR" llega con guion: se normaliza. Para idiomas sin territorio
    // estándar (jv, wuu) se usa el del mapa o se omite: un locale inventado
    // como "jv_JV" es inválido y rompía la vista previa social.
    const normalized = locale.replace("-", "_");
    const [lang, region] = normalized.split("_");
    const mapped = LOCALE_MAP[lang as string] || (region ? normalized : "");
    if (mapped) upsertMeta("property", "og:locale", mapped);
  }
  upsertMeta("property", "og:image", absoluteImage);
  upsertMeta("name", "twitter:image", absoluteImage);
  upsertCanonical(url);
}

/** Restaura los metadatos por defecto de la landing. */
export function resetSocialMeta() {
  applySocialMeta({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
  });
}

// ── hreflang multiidioma ──────────────────────────────────────────────────
// La app es una SPA sin rutas por idioma: cada idioma se expone con `?lang=<code>`
// (soportado por el detector de i18n). Se inyectan los <link rel="alternate"
// hreflang> de los idiomas disponibles + `x-default` para que los buscadores
// conozcan las variantes. Marcados aparte (data-wedin-i18n-seo) para poder
// reemplazarlos sin tocar las meta sociales (que usan otro marker).
const HREFLANG_MARK = "data-wedin-i18n-seo";
const HREFLANG_CODES = LANGUAGE_GROUPS.flatMap((g) => g.languages.map((l) => l.code));

/** Reemplaza los enlaces hreflang alternativos del documento. */
export function applyHreflangLinks(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const head = document.head;
  head.querySelectorAll(`link[${HREFLANG_MARK}]`).forEach((el) => el.remove());

  const url = new URL(window.location.href);
  url.searchParams.delete("lang");
  const base = `${url.origin}${url.pathname}${url.search}`;

  const frag = document.createDocumentFragment();
  for (const code of HREFLANG_CODES) {
    const link = document.createElement("link");
    link.rel = "alternate";
    link.hreflang = code;
    const u = new URL(base);
    u.searchParams.set("lang", code);
    link.href = u.toString();
    link.setAttribute(HREFLANG_MARK, "");
    frag.appendChild(link);
  }
  const xDefault = document.createElement("link");
  xDefault.rel = "alternate";
  xDefault.hreflang = "x-default";
  xDefault.href = base;
  xDefault.setAttribute(HREFLANG_MARK, "");
  frag.appendChild(xDefault);
  head.appendChild(frag);
}
