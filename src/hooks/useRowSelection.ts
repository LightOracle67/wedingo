/**
 * useRowSelection — Selección de filas de tabla (acciones genéricas).
 *
 * Gestión compartida de la selección de filas para las tablas de la app: cada
 * fila se identifica por una clave (id). Ofrece alternar una fila, seleccionar
 * o deseleccionar todas, y consultar si una fila está seleccionada o si están
 * todas. Las ACCIONES en lote (borrar, exportar, revocar...) se muestran FUERA
 * de la tabla (TableActionsBar) y operan sobre `selected`.
 */
import { useCallback, useMemo, useState } from "react";

export function useRowSelection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  // Alterna la selección de una fila.
  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Selecciona todas las filas disponibles (o deselecciona si ya están todas).
  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const idsArr = ids ?? [];
      const allSelected = idsArr.length > 0 && idsArr.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(idsArr);
    });
  }, []);

  // Reemplaza la selección por un conjunto concreto de ids.
  const setSelectedIds = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);
  const selectedCount = selected.size;

  const allSelected = useMemo(() => selected.size > 0, [selected]);

  return { selected, toggle, toggleAll, setSelectedIds, clear, isSelected, selectedCount, allSelected };
}
