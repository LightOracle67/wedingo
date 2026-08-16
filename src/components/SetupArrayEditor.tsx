/**
 * SetupArrayEditor — Contenedor de listas editables de filas (agenda,
 * salidas de transporte, platos de menú).
 *
 * Centraliza el esqueleto que se repetía en DateSectionForm, TransportSectionForm
 * y MenuDishEditor: fila flex (contenido renderizado por `renderRow`) + botón
 * de quitar + botón de añadir + aviso de máximo. La lógica de datos
 * (añadir/quitar/editar JSON) la aporta `useJsonArrayField` en cada editor.
 */

import { memo, type ReactNode } from "react";

interface SetupArrayEditorProps {
  /** Número de filas actuales. */
  count: number;
  /** Máximo de filas permitido. */
  max: number;
  /** Texto del botón "Añadir" (p. ej. "+ Añadir evento"). */
  addLabel: string;
  /** aria-label del botón quitar de cada fila. */
  removeLabel: string;
  /** Texto del aviso cuando se alcanza el máximo. */
  maxLabel: string;
  /** Añade una fila. */
  onAdd: () => void;
  /** Quita la fila en el índice dado. */
  onRemove: (index: number) => void;
  /** Renderiza el contenido (inputs/labels) de la fila en el índice dado. */
  renderRow: (index: number) => ReactNode;
}

const SetupArrayEditor = memo(function SetupArrayEditor({
  count,
  max,
  addLabel,
  removeLabel,
  maxLabel,
  onAdd,
  onRemove,
  renderRow,
}: SetupArrayEditorProps) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem", flexWrap: "wrap" }}
        >
          {renderRow(i)}
          <button
            type="button"
            className="setup-button setup-button--ghost setup-button--compact"
            onClick={() => onRemove(i)}
            style={{ marginTop: "1.4rem", flexShrink: 0 }}
            aria-label={removeLabel}
          >
            ✕
          </button>
        </div>
      ))}
      {count < max ? (
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={onAdd}
          style={{ marginTop: "0.6rem" }}
        >
          + {addLabel}
        </button>
      ) : null}
      {count >= max ? <p className="setup-help">{maxLabel}</p> : null}
    </div>
  );
});

export default SetupArrayEditor;
