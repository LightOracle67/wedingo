/**
 * animations.ts — Registro canónico de las animaciones de la invitación pública.
 *
 * Cada animación tiene un `id` kebab-case único y pertenece a un grupo.
 * El registro es la ÚNICA fuente de verdad para:
 *  - El panel del admin (AnimationsSectionForm): qué animaciones puede
 *    desactivar la pareja y que se guardan en `config.disabledAnimations`.
 *  - El panel de accesibilidad (AccessibilityPanel): qué animaciones puede
 *    desactivar adicionalmente cada invitado en su dispositivo.
 *  - Las reglas CSS de «kill» (animations.css) vía la clase
 *    `html.wed-no-anim-<id>` aplicada por AnimationPrefsApplier.
 *  - Los consumidores con lógica JS (sobre, confeti, navegación de secciones,
 *    hero, galería): leen `isDisabled()` del hook `useAnimations`.
 *
 * Una animación está DESACTIVADA si está en `config.disabledAnimations`
 * (decidido por los novios) O en las preferencias locales del invitado.
 * El invitado puede desactivar más, pero nunca reactivar las que los novios
 * desactivaron (la config del admin es la base).
 */

interface AnimationGroupDef {
  /** Identificador único del grupo (kebab-case). */
  id: string;
}

interface AnimationDef {
  /** Identificador único de la animación (kebab-case). */
  id: string;
  /** Grupo al que pertenece (ver ANIMATION_GROUPS). */
  groupId: string;
}

/** Grupos de animaciones en el orden de presentación en los paneles. */
export const ANIMATION_GROUPS: readonly AnimationGroupDef[] = [
  { id: "envelope" },
  { id: "confetti" },
  { id: "welcomeVideo" },
  { id: "decorations" },
  { id: "navigation" },
  { id: "fireflies" },
  { id: "music" },
  { id: "hero" },
  { id: "gallery" },
  { id: "micro" },
  { id: "background" },
  { id: "toasts" },
] as const;

/**
 * Catálogo completo de animaciones de la invitación pública, del sobre a las
 * microinteracciones. Cada entrada necesita su nombre y hint en i18n
 * (`animations.items.<id>.name` / `.hint`) y, si aplica, una regla de kill en
 * animations.css. Si se añade una animación nueva, debe registrarse aquí,
 * en i18n y (si es CSS) en animations.css.
 */
export const ANIMATIONS: readonly AnimationDef[] = [
  // ── Sobre (secuencia de apertura) ────────────────────────────
  { id: "envelope-flap", groupId: "envelope" },
  { id: "envelope-lights", groupId: "envelope" },
  { id: "envelope-flash", groupId: "envelope" },
  { id: "envelope-golden-text", groupId: "envelope" },
  { id: "envelope-hint-pulse", groupId: "envelope" },
  { id: "envelope-letter-fade", groupId: "envelope" },
  { id: "envelope-overlay-fade", groupId: "envelope" },
  // ── Confeti al abrir el sobre ────────────────────────────────
  { id: "confetti-fall", groupId: "confetti" },
  // ── Vídeo de bienvenida ──────────────────────────────────────
  { id: "welcome-video-modal", groupId: "welcomeVideo" },
  // ── Decoraciones (ramas de eucalipto) ────────────────────────
  { id: "decoration-sway", groupId: "decorations" },
  { id: "decoration-float", groupId: "decorations" },
  // ── Navegación entre secciones ───────────────────────────────
  { id: "story-transitions", groupId: "navigation" },
  { id: "story-reveal", groupId: "navigation" },
  { id: "story-smooth-scroll", groupId: "navigation" },
  { id: "story-snap", groupId: "navigation" },
  { id: "story-hover", groupId: "navigation" },
  // ── Luciérnagas de fondo ─────────────────────────────────────
  { id: "fireflies", groupId: "fireflies" },
  // ── Reproductor de música ────────────────────────────────────
  { id: "music-equalizer", groupId: "music" },
  { id: "music-fab-pulse", groupId: "music" },
  { id: "music-card-open", groupId: "music" },
  { id: "music-icon-bounce", groupId: "music" },
  { id: "music-fab-shift", groupId: "music" },
  { id: "music-dot-blink", groupId: "music" },
  { id: "music-play-glow", groupId: "music" },
  { id: "music-spinner", groupId: "music" },
  { id: "music-fab-hover", groupId: "music" },
  { id: "music-status-shake", groupId: "music" },
  // ── Portada (hero) ───────────────────────────────────────────
  { id: "hero-photo-ring", groupId: "hero" },
  { id: "hero-godparent-glow", groupId: "hero" },
  { id: "hero-photo-fade", groupId: "hero" },
  { id: "countdown-tick", groupId: "hero" },
  { id: "loading-spinner", groupId: "hero" },
  // ── Galería de fotos ─────────────────────────────────────────
  { id: "gallery-blur", groupId: "gallery" },
  { id: "gallery-caption", groupId: "gallery" },
  { id: "gallery-lightbox", groupId: "gallery" },
  { id: "gallery-thumb-hover", groupId: "gallery" },
  { id: "gallery-nav-hover", groupId: "gallery" },
  { id: "gallery-auto-advance", groupId: "gallery" },
  // ── Microinteracciones ───────────────────────────────────────
  { id: "button-hover", groupId: "micro" },
  { id: "reaction-hover", groupId: "micro" },
  // ── Fondos ───────────────────────────────────────────────────
  { id: "theme-glow-depth", groupId: "background" },
  { id: "landing-pulse", groupId: "background" },
  // ── Avisos (toasts) ──────────────────────────────────────────
  { id: "toast-animations", groupId: "toasts" },
] as const;

/** Conjunto de ids válidos (para sanitizar la config y el storage). */
export const ANIMATION_IDS: ReadonlySet<string> = new Set(ANIMATIONS.map((a) => a.id));

/** Devuelve si un id es una animación registrada. */
export function isAnimationId(id: string): boolean {
  return ANIMATION_IDS.has(id);
}

/**
 * Clave reservada para "desactivar TODAS las animaciones" dentro del campo
 * `disabledAnimations` (admin) o de las preferencias del invitado. Cuando está
 * presente, el conjunto efectivo es el de todos los ids y, además, los
 * comportamientos completos (p. ej. el sobre) se saltan por código.
 */
export const ALL_ANIMATIONS_KEY = "all";

/** Anima a que un grupo esté vacío: nada que filtrar (optimización). */
export const EMPTY_ANIMATION_SET: ReadonlySet<string> = new Set();

/** Conjunto de TODOS los ids de animaciones reales (cuando `all` está activo). */
export const ALL_ANIMATION_IDS: ReadonlySet<string> = new Set(ANIMATIONS.map((a) => a.id));

/** Devuelve si un id es una animación real O la clave reservada `all`. */
function isStoredAnimationKey(id: string): boolean {
  return id === ALL_ANIMATIONS_KEY || isAnimationId(id);
}

/**
 * Parsea un campo `disabledAnimations` (string separado por comas) a un Set,
 * descartando ids no registrados (evita que un valor corrupto rompa la app o
 * que ids antiguos de animaciones eliminadas sigan aplicando). La clave
 * reservada `all` se conserva.
 */
export function parseDisabledAnimations(raw: string | undefined | null): ReadonlySet<string> {
  if (!raw) return EMPTY_ANIMATION_SET;
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(isStoredAnimationKey);
  // Sin ids válidos se devuelve el set vacío compartido (sin alocaciones).
  if (ids.length === 0) return EMPTY_ANIMATION_SET;
  return new Set(ids);
}

/**
 * Serializa un iterable de ids desactivados a un string ordenado y deduplicado
 * (determinista: facilita diff de config y caché). Conserva `all`.
 */
export function serializeDisabledAnimations(ids: Iterable<string>): string {
  const unique = new Set<string>();
  for (const id of ids) {
    if (isStoredAnimationKey(id)) unique.add(id);
  }
  return Array.from(unique).sort().join(",");
}

/**
 * Activa (`allOff=true`) o desactiva (`allOff=false`) la clave global `all`
 * dentro de la lista actual, CONSERVANDO los ids individuales que hubiera:
 * al volver a activar animaciones se recuperan las preferencias previas.
 */
export function toggleAllDisabled(raw: string | undefined, allOff: boolean): string {
  const current = new Set(parseDisabledAnimations(raw));
  if (allOff) current.add(ALL_ANIMATIONS_KEY);
  else current.delete(ALL_ANIMATIONS_KEY);
  return serializeDisabledAnimations(current);
}

/**
 * Devuelve el string `disabledAnimations` resultante de activar (`enabled=true`)
 * o desactivar (`enabled=false`) UNA animación dentro de la lista actual.
 * Las animaciones se almacenan DESACTIVADAS: `enabled=false` añade el id y
 * `enabled=true` lo quita.
 */
export function toggleDisabledAnimations(raw: string | undefined, id: string, enabled: boolean): string {
  const current = new Set(parseDisabledAnimations(raw));
  if (enabled) {
    current.delete(id);
  } else {
    current.add(id);
  }
  return serializeDisabledAnimations(current);
}

/** Agrupa las animaciones del registro por grupo, respetando el orden. */
export function animationsByGroup(): Map<string, readonly AnimationDef[]> {
  const map = new Map<string, AnimationDef[]>();
  for (const group of ANIMATION_GROUPS) map.set(group.id, []);
  for (const anim of ANIMATIONS) {
    const bucket = map.get(anim.groupId);
    if (bucket) bucket.push(anim);
  }
  return map;
}
