/**
 * SetupField — Bloque de campo del editor de la invitación (label + control +
 * hint + error), compartido por todos los formularios.
 *
 * Centraliza el patrón `label → children → (hint|error)` que se repetía en
 * AccessSectionForm, CoverSectionForm, DateSectionForm y GuestsSectionForm.
 * El label se asocia al control (htmlFor/id) y el hint lleva su id para
 * `aria-describedby` (WCAG 1.3.1). El control es `children` (el padre decide
 * si es input/select/textarea y sus clases de error).
 */

import { memo, type ReactNode, type CSSProperties } from "react";

interface SetupFieldProps {
  /** Id del control (asocia el label). */
  id: string;
  /** Texto del label. */
  label: string;
  /** Texto de ayuda; se renderiza con su id para aria-describedby. */
  hint?: string;
  /** Id del hint (referenciado por aria-describedby del control). */
  hintId?: string;
  /** Marca el label como obligatorio (`setup-label--required`). */
  required?: boolean;
  /** Mensaje de error inline (rojo, anunciado con role="alert"). */
  error?: string;
  /** Posición del hint respecto al control. */
  hintPosition?: "after" | "before";
  /** Clase del contenedor (p. ej. celdas de grid). */
  className?: string;
  /** Estilo del contenedor (para preservar márgenes/posiciones existentes). */
  style?: CSSProperties;
  /** El control (input/select/textarea). */
  children: ReactNode;
}

const SetupField = memo(function SetupField({
  id,
  label,
  hint,
  hintId,
  required = false,
  error,
  hintPosition = "after",
  className,
  style,
  children,
}: SetupFieldProps) {
  return (
    <div className={className} style={style}>
      <label className={required ? "setup-label setup-label--required" : "setup-label"} htmlFor={id}>
        {label}
      </label>
      {hint && hintPosition === "before" ? (
        <p className="setup-help" id={hintId} style={{ marginTop: "0.1rem", fontSize: "0.75rem" }}>
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="setup-help" role="alert" style={{ color: "#ef4444" }}>
          {error}
        </p>
      ) : null}
      {hint && hintPosition === "after" ? (
        <p className="setup-help" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default SetupField;
