/** Entrada del historial de versiones mostrada en el modal de changelog. */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}