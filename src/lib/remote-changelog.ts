/**
 * Changelog remoto: la aplicación muestra la versión del historial que vive en
 * GitHub (CHANGELOG.md del repo) en lugar de la copia empaquetada en el bundle.
 * Así el historial solo se actualiza en el repositorio y la página lo recoge
 * de raw.githubusercontent.com, guardándolo en localStorage para poder
 * mostrarlo sin conexión (y para no descargarlo en cada apertura).
 */
import type { ChangelogEntry } from "./changelog-types";
export const CHANGELOG_RAW_URL =
  "https://raw.githubusercontent.com/LightOracle67/wedingo/main/CHANGELOG.md";

/** Clave de localStorage donde se guarda el changelog descargado + timestamp. */
export const CHANGELOG_CACHE_KEY = "wedin_changelog_cache";

/** Tiempo de vida de la caché: 6 horas (no re-descargar en cada apertura). */
export const CHANGELOG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface ChangelogCache {
  ts: number;
  entries: ChangelogEntry[];
}

/**
 * Parsea el markdown de CHANGELOG.md a entradas estructuradas. Formato por
 * bloque:
 *   ## 2.134.1 — 2026-08-26
 *   - cambio 1
 *   - cambio 2
 * Los bloques malformados se descartan en silencio (el modal solo muestra las
 * versiones bien estructuradas).
 */
export function parseChangelogMarkdown(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  const headerRe = /^##\s+(.+?)\s*[—-]\s*(\d{4}-\d{2}-\d{2})$/;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    const header = headerRe.exec(line);
    if (header) {
      const version = header[1]?.trim();
      const date = header[2];
      if (!version || !date) continue;
      current = { version, date, changes: [] };
      entries.push(current);
      continue;
    }
    if (line.startsWith("- ") && current) {
      current.changes.push(line.slice(2).trim());
    }
  }
  return entries.filter((e) => e.changes.length > 0);
}

/** Lee la caché de localStorage si existe y no ha expirado. */
export function readChangelogCache(): ChangelogEntry[] | null {
  try {
    const raw = window.localStorage.getItem(CHANGELOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChangelogCache;
    if (
      !Array.isArray(parsed.entries) ||
      typeof parsed.ts !== "number" ||
      Date.now() - parsed.ts > CHANGELOG_CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed.entries;
  } catch {
    // JSON corrupto o localStorage no disponible: se trata como sin caché.
    return null;
  }
}

/** Guarda las entradas en localStorage con el timestamp actual. */
export function writeChangelogCache(entries: ChangelogEntry[]): void {
  try {
    window.localStorage.setItem(CHANGELOG_CACHE_KEY, JSON.stringify({ ts: Date.now(), entries } satisfies ChangelogCache));
  } catch {
    // localStorage lleno o bloqueado: la caché es opcional, no falla la UI.
  }
}

/** Carga el changelog: caché local → GitHub → bundle de la aplicación. */
export async function loadChangelog(): Promise<ChangelogEntry[]> {
  const cached = readChangelogCache();
  if (cached) return cached;
  try {
    const res = await fetch(CHANGELOG_RAW_URL, { headers: { Accept: "text/plain" } });
    if (!res.ok) throw new Error(`changelog fetch ${res.status}`);
    const markdown = await res.text();
    const entries = parseChangelogMarkdown(markdown);
    if (entries.length > 0) {
      writeChangelogCache(entries);
      return entries;
    }
  } catch {
    // Red no disponible: se cae al respaldo del bundle (datos antiguos).
  }
  const fallback = await import("./changelog");
  return fallback.CHANGELOG;
}