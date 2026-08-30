import { type ReactNode } from "react";
import { useConfigActions, useFormField } from "../contexts";

interface SetupToggleFieldProps {
  /** Campo *Enabled que activa/oculta el input. */
  enabledField: string;
  label: string;
  hint?: string;
  /** Id del hint (para aria-describedby desde el input asociado). */
  hintId?: string;
  /** Función id(name) del formulario (añade el prefijo del paso del setup). */
  id: (name: string) => string;
  children: ReactNode;
}

/**
 * SetupToggleField — Patrón general de los campos opcionales del setup:
 * un checkbox que, al seleccionarse, muestra el input que lo acompaña. Si el
 * input se deja vacío, la sección correspondiente se desactiva (lo decide
 * sectionHasContent al guardar). Centraliza el patrón para todos los campos.
 *
 * El valor del toggle se lee con useFormField (re-render acotado a este campo,
 * no a todo el árbol del Setup cuando se teclea en otro campo).
 */
export default function SetupToggleField({ enabledField, label, hint, hintId, id, children }: SetupToggleFieldProps) {
  const { updateFormField } = useConfigActions();
  const enabledValue = useFormField(enabledField);
  const enabled = enabledValue === "true";
  const toggle = () => updateFormField(enabledField, enabled ? "false" : "true");

  return (
    <>
      <div className="setup-toggle-row">
        <input
          type="checkbox"
          className="setup-toggle"
          id={id(enabledField)}
          checked={enabled}
          onChange={toggle}
          aria-label={label}
        />
        <div>
          <label className="setup-label setup-label--tight" htmlFor={id(enabledField)}>
            {label}
          </label>
          {/* El hint lleva id cuando el input asociado lo referencia con
              aria-describedby (WCAG 1.3.1): si no, es una referencia rota. */}
          {hint ? (
            <p className="setup-help setup-help--tight" id={hintId}>
              {hint}
            </p>
          ) : null}
        </div>
      </div>
      {enabled ? children : null}
    </>
  );
}
