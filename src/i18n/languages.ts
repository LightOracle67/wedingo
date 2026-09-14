/**
 * languages.ts — Registro data-driven de los idiomas disponibles.
 *
 * Fuente de verdad para el selector de idioma (LanguageSwitcher). Cada idioma
 * aparece con su nombre NATIVO y agrupado por continente. "Auto" se gestiona en
 * el componente (vuelve a la detección del navegador).
 *
 * Nota: los nombres de continente y "Auto" son estáticos (no vía i18n) a
 * propósito: añadirlos como claves obligaría a propagarlas a los ~47 locales
 * generados. Si en el futuro se quieren traducir los grupos, basta con moverlos
 * a claves `lang.group.*` y regenerar los locales.
 */
export interface AvailableLanguage {
  /** Código BCP-47 tal cual el fichero de locales (p.ej. "pt-BR"). */
  code: string;
  /** Nombre del idioma en sí mismo (p.ej. "Português (Brasil)"). */
  nativeName: string;
  /** true si el idioma se escribe de derecha a izquierda. */
  rtl?: boolean;
}

export interface LanguageGroup {
  label: string;
  languages: AvailableLanguage[];
}

const RTL_BASES = new Set(["ar", "fa", "he", "ur"]);

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    label: "Default",
    languages: [
      { code: "es", nativeName: "Español" },
      { code: "en", nativeName: "English" },
    ],
  },
  {
    label: "Europe",
    languages: [
      { code: "fr", nativeName: "Français" },
      { code: "de", nativeName: "Deutsch" },
      { code: "it", nativeName: "Italiano" },
      { code: "pt-PT", nativeName: "Português (Europeu)" },
      { code: "nl", nativeName: "Nederlands" },
      { code: "ru", nativeName: "Русский" },
      { code: "uk", nativeName: "Українська" },
      { code: "pl", nativeName: "Polski" },
      { code: "tr", nativeName: "Türkçe" },
      { code: "el", nativeName: "Ελληνικά" },
    ],
  },
  {
    label: "Asia",
    languages: [
      { code: "zh-CN", nativeName: "中文（简体）" },
      { code: "ja", nativeName: "日本語" },
      { code: "ko", nativeName: "한국어" },
      { code: "hi", nativeName: "हिन्दी" },
      { code: "bn", nativeName: "বাংলা" },
      { code: "ta", nativeName: "தமிழ்" },
      { code: "id", nativeName: "Bahasa Indonesia" },
      { code: "ms", nativeName: "Bahasa Melayu" },
      { code: "th", nativeName: "ไทย" },
      { code: "vi", nativeName: "Tiếng Việt" },
      { code: "tl", nativeName: "Tagalog" },
    ],
  },
  {
    label: "Middle East",
    languages: [
      { code: "ar-SA", nativeName: "العربية", rtl: true },
      { code: "fa", nativeName: "فارسی", rtl: true },
      { code: "he", nativeName: "עברית", rtl: true },
      { code: "ur", nativeName: "اردو", rtl: true },
    ],
  },
  {
    label: "Africa",
    languages: [
      { code: "sw", nativeName: "Kiswahili" },
      { code: "am", nativeName: "አማርኛ" },
      { code: "ha", nativeName: "Hausa" },
      { code: "yo", nativeName: "Yorùbá" },
      { code: "zu", nativeName: "isiZulu" },
      { code: "af-ZA", nativeName: "Afrikaans" },
    ],
  },
  {
    label: "Americas",
    languages: [
      { code: "pt-BR", nativeName: "Português (Brasil)" },
      { code: "fr-CA", nativeName: "Français (Canada)" },
    ],
  },
];

/** Flat lookup de código → configuración. */
const BY_CODE = new Map<string, AvailableLanguage>();
for (const g of LANGUAGE_GROUPS) {
  for (const l of g.languages) BY_CODE.set(l.code.toLowerCase(), l);
}

export function getLanguage(code: string): AvailableLanguage | undefined {
  return BY_CODE.get(code.toLowerCase());
}

/** Si el idioma (o su base) es de escritura derecha→izquierda. */
export function isRtlLang(code: string): boolean {
  const base = (code || "").toLowerCase().split("-")[0] ?? "";
  return RTL_BASES.has(base);
}

/** Resuelve un código i18n (p.ej. "pt-BR" o "en-US") a su base del registro si existe. */
export function resolveLanguageCode(code: string): string {
  const base = (code || "").toLowerCase().split("-")[0] ?? "";
  const entry = getLanguage(code);
  return entry ? entry.code : base;
}