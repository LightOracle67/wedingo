import { type ReactNode } from "react";
import { useConfig } from "../contexts";

interface SetupToggleFieldProps {
  /** Campo *Enabled que activa/oculta el input. */
  enabledField: string;
  label: string;
  hint?: string;
  /** Función id(name) del formulario (añade el prefijo del paso del setup). */
  id: (name: string) => string;
  children: ReactNode;
}

/**
 * SetupToggleField — Patrón general de los campos opcionales del setup:
 * un checkbox que, al seleccionarse, muestra el input que lo acompaña. Si el
 * input se deja vacío, la sección correspondiente se desactiva (lo decide
 * sectionHasContent al guardar). Centraliza el patrón para todos los campos.
 */
export default function SetupToggleField({ enabledField, label, hint, id, children }: SetupToggleFieldProps) {
  const { formData, updateFormField } = useConfig();
  const enabled = formData[enabledField] === "true";
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
          {hint ? <p className="setup-help setup-help--tight">{hint}</p> : null}
        </div>
      </div>
      {enabled ? children : null}
    </>
  );
}
