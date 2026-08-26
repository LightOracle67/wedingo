/**
 * useColumnSort — Ordenación de tablas por columnas.
 *
 * Gestión del estado de ordenación de una tabla: cada columna declara su
 * `key` (campo o `getValue`) y su `type` (cómo comparar). Al hacer clic en el
 * encabezado de una columna el orden cicla asc → desc → default (sin orden):
 * - Clic en una columna distinta → orden ascendente.
 * - Clic de nuevo en la misma → descendente.
 * - Un tercer clic → vuelve al orden original (default).
 *
 * Los valores vacíos (null/undefined/"") se colocan SIEMPRE al final, en
 * cualquier dirección, para no romper la lectura de la tabla.
 *
 * @param rows   - Filas ya filtradas (la ordenación se aplica después de filtrar).
 * @param columns- Definición de columnas (key + type + getValue opcional).
 */
import { useCallback, useMemo, useState } from "react";

export type SortOrder = "asc" | "desc" | "default";
export type ColumnType = "string" | "number" | "date" | "boolean";

export interface SortableColumn<T> {
  /** Clave única de la columna (la usa el encabezado para ordenar). */
  key: string;
  /** Tipo de comparación: string, number, date o boolean. */
  type?: ColumnType;
  /** Extrae el valor a comparar (útil si la celda muestra un valor derivado). */
  getValue?: (row: T) => unknown;
}

// Considera "vacío" los valores nulos, indefinidos o cadenas vacías.
const isEmptyValue = (v: unknown): boolean => v === null || v === undefined || v === "";

// Compara dos valores según el tipo de columna (sin tratar vacíos: eso lo
// gestiona el comparador del hook para que SIEMPRE queden al final).
function compareValues(a: unknown, b: unknown, type: ColumnType): number {
  switch (type) {
    case "number": {
      return Number(a) - Number(b);
    }
    case "date": {
      const da = new Date(String(a)).getTime();
      const db = new Date(String(b)).getTime();
      // Fechas no parseables: se comparan como texto (no romper la ordenación).
      if (Number.isNaN(da) || Number.isNaN(db)) return String(a).localeCompare(String(b));
      return da - db;
    }
    case "boolean": {
      return Number(Boolean(a)) - Number(Boolean(b));
    }
    default: {
      // Comparación textual con soporte de números embebidos (p. ej. "v2.10").
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
    }
  }
}

export function useColumnSort<T>(rows: T[], columns: SortableColumn<T>[]) {
  const [sortKey, setSortKey] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");

  // Ciclo asc → desc → default al pulsar la misma columna; columna nueva → asc.
  // Memoizado: solo cambia cuando cambia la columna ordenada (raro), no en
  // cada render de la tabla (p. ej. al filtrar).
  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortOrder("asc");
        return;
      }
      setSortOrder((order) => (order === "asc" ? "desc" : "default"));
    },
    [sortKey],
  );

  const sorted = useMemo(() => {
    if (!sortKey || sortOrder === "default") return rows;
    const column = columns.find((c) => c.key === sortKey);
    const type = column?.type ?? "string";
    const getValue = column?.getValue ?? ((row: T) => (row as Record<string, unknown>)[sortKey]);
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      // Los valores vacíos van SIEMPRE al final, en asc y en desc.
      const aEmpty = isEmptyValue(va);
      const bEmpty = isEmptyValue(vb);
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      return compareValues(va, vb, type) * direction;
    });
  }, [rows, sortKey, sortOrder, columns]);

  // Estado de orden para un encabezado: "asc" | "desc" | "default".
  const getIndicator = useCallback(
    (key: string): SortOrder => (sortKey === key ? sortOrder : "default"),
    [sortKey, sortOrder],
  );

  return { sorted, sortKey, sortOrder, toggleSort, getIndicator };
}
