/**
 * SortableTh — Encabezado de columna ordenable.
 *
 * Renderiza un `<th>` cuyo contenido es un botón que ocupa TODO el contenedor
 * del título: al hacer clic se alterna asc → desc → default (gestión del orden
 * en useColumnSort). Incluye un indicador visual (▲/▼/↕) y `aria-sort` para
 * lectores de pantalla (WCAG 1.3.1 / 2.4.6).
 *
 * @param columnKey - Clave de la columna (para toggleSort/getIndicator).
 * @param order     - Estado actual del orden para esta columna.
 * @param onSort    - Callback que alterna el orden (toggleSort del hook).
 * @param className - Clase CSS del `<th>` (p. ej. "data-tab-th").
 * @param style     - Estilos inline del `<th>`.
 */
import type { CSSProperties, ReactNode } from "react";
import type { SortOrder } from "../lib/useColumnSort";

interface SortableThProps {
  columnKey: string;
  order: SortOrder;
  onSort: (key: string) => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Etiqueta accesible alternativa (por defecto se usa el texto visible). */
  ariaLabel?: string;
}

const INDICATORS: Record<SortOrder, string> = {
  asc: "▲",
  desc: "▼",
  default: "↕",
};

export function SortableTh({ columnKey, order, onSort, children, className, style, ariaLabel }: SortableThProps) {
  // aria-sort acepta: "none" | "ascending" | "descending" | "other".
  const ariaSort = order === "asc" ? "ascending" : order === "desc" ? "descending" : "none";
  const label = ariaLabel ?? (typeof children === "string" ? children : "");
  const sortHint = order === "asc" ? " · ordenado ascendente" : order === "desc" ? " · ordenado descendente" : "";

  return (
    <th scope="col" aria-sort={ariaSort} className={className} style={style}>
      <button
        type="button"
        className="table-sort-btn"
        onClick={() => onSort(columnKey)}
        aria-label={label ? `${label}${sortHint}. Pulsa para ordenar` : undefined}
      >
        <span>{children}</span>
        <span className="table-sort-indicator" aria-hidden="true">
          {INDICATORS[order]}
        </span>
      </button>
    </th>
  );
}
