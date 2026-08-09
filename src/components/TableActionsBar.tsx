/**
 * TableActionsBar — Barra genérica de acciones de tabla.
 *
 * Se muestra FUERA de la tabla (encima) y agrupa: el selector "seleccionar
 * todas", el contador de filas seleccionadas y los botones de acción en lote
 * que operan sobre la selección (children). Reutilizable por todas las tablas
 * para mantener un patrón de acciones genérico y consistente.
 *
 * @param total           - Total de filas.
 * @param selectedCount   - Filas seleccionadas.
 * @param allSelected     - Si están todas seleccionadas.
 * @param onToggleAll     - Selecciona/deselecciona todas.
 * @param selectAllLabel  - Etiqueta accesible del checkbox.
 * @param selectedLabel   - Plantilla del contador ("{{count}} de {{total}}").
 * @param children        - Botones de acción en lote (opcional).
 */
import type { ReactNode } from "react";

interface TableActionsBarProps {
  total: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  selectAllLabel?: string;
  selectedLabel?: string;
  children?: ReactNode;
}

export function TableActionsBar({
  total,
  selectedCount,
  allSelected,
  onToggleAll,
  selectAllLabel = "Seleccionar todas",
  selectedLabel = "{{count}} de {{total}}",
  children,
}: TableActionsBarProps) {
  const isAll = allSelected && total > 0 && selectedCount === total;
  return (
    <div className="table-actions-bar">
      <label className="table-actions-bar__select">
        <input
          type="checkbox"
          checked={isAll}
          onChange={onToggleAll}
          aria-label={selectAllLabel}
        />
        <span className="table-actions-bar__count" aria-live="polite">
          {selectedCount > 0 ? selectedLabel.replace("{{count}}", String(selectedCount)).replace("{{total}}", String(total)) : String(total)}
        </span>
      </label>
      {children ? <div className="table-actions-bar__buttons">{children}</div> : null}
    </div>
  );
}
