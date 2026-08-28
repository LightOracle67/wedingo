/**
 * Fallback offline del historial de versiones.
 *
 * La fuente real es CHANGELOG.md (GitHub, vía remote-changelog.ts con caché
 * local de 6 horas). Este stub existe únicamente para que el modal no falle
 * cuando no hay red ni caché: devuelve una lista vacía en lugar de los 275 KB
 * de entradas embebidas que antes viajaban en el bundle (52 KB gzip).
 */
import type { ChangelogEntry } from "./changelog-types";

export const CHANGELOG: ChangelogEntry[] = [];
