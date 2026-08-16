/**
 * SetupToggleRow — Fila de toggle del editor de la invitación (Setup/Admin).
 *
 * Checkbox primero y título + hint después (la activación se ve a simple
 * vista). Definida FUERA de los formularios que la usan para mantener una
 * referencia ESTABLE entre renders: una fila definida en el cuerpo de un
 * componente se re-creaba en cada render, provocando que React
 * desmontara/remontara el subárbol (pérdida de foco en inputs hijos).
 */

import type { ReactNode } from "react";

interface SetupToggleRowProps {
  field: string;
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  /** Genera el id único del input a partir de un nombre base. */
  id: (name: string) => string;
  children?: ReactNode;
}

export default function SetupToggleRow({ field, label, hint, checked, onToggle, id, children }: SetupToggleRowProps) {
  return (
    <div className="setup-toggle-row">
      <input
        type="checkbox"
        className="setup-toggle"
        id={id(`${field}Toggle`)}
        checked={checked}
        onChange={onToggle}
        aria-label={label}
      />
      <div>
        <label className="setup-label setup-label--tight" htmlFor={id(`${field}Toggle`)}>
          {label}
        </label>
        {hint ? <p className="setup-help setup-help--tight">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
