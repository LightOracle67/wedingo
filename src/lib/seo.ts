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

/** Prefijo base de las URLs públicas del sitio. */
export const SITE_URL = "https://wedingo-6c26a.web.app";

/** Metadatos por defecto usados por la landing (restauran el head). */
const DEFAULT_TITLE = "Wedingo — Invitaciones de boda personalizadas";
const DEFAULT_DESCRIPTION =
  "Crea y comparte invitaciones de boda únicas con RSVP, galería de fotos, mapa interactivo y música.";

/** Atributo que identifica las meta tags gestionadas por este módulo. */
const META_MARKER = "data-wedingo-seo";

/**
 * Crea (o actualiza) una meta tag en <head> con el atributo indicado.
 * Marca la tag con data-wedingo-seo para poder limpiarla después.
 */
function upsertMeta(attr: "property" | "name", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute(META_MARKER, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Crea (o actualiza) el <link rel="canonical"> del documento.
 */
function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute(META_MARKER, "true");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

/**
 * Elimina todas las meta tags y el canonical marcados como SEO dinámico.
 * Se usa al desmontar la invitación para restaurar el head por defecto.
 */
export function clearSocialMeta() {
  document.head.querySelectorAll(`[${META_MARKER}]`).forEach((el) => el.remove());
}

export interface SocialMetaInput {
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

/**
 * Aplica las meta tags Open Graph y Twitter de la invitación.
 * La imagen solo se publica si es una URL absoluta http(s): los datos
 * en data URI no son indexables por los rastreadores sociales.
 */
export function applySocialMeta({ title, description, url, image, locale }: SocialMetaInput) {
  const absoluteImage = image && /^https?:\/\//.test(image) ? image : undefined;

  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:site_name", "Wedingo");
  upsertMeta("property", "og:type", "website");
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  if (locale) upsertMeta("property", "og:locale", locale);
  if (absoluteImage) {
    upsertMeta("property", "og:image", absoluteImage);
    upsertMeta("name", "twitter:image", absoluteImage);
  } else {
    // Sin imagen indexable se deja la tarjeta en modo "summary".
    upsertMeta("name", "twitter:card", "summary");
  }
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
