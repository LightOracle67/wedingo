import { memo } from "react";
import type { Translate } from "./derive";

interface AttendanceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  frozen: boolean;
  t: Translate;
}

/**
 * Selector de asistencia tipo "segmented control": tres opciones grandes y
 * tocables (solo / con acompañantes / no asisto) en lugar del select clásico.
 * Usa radios reales para accesibilidad y teclado.
 */
const AttendanceSelector = memo(function AttendanceSelector({ value, onChange, frozen, t }: AttendanceSelectorProps) {
  // Opciones con icono SVG inline (sin dependencias nuevas).
  const options = [
    { value: "alone", labelKey: "rsvp.attendingAlone", icon: "👤" },
    { value: "with", labelKey: "rsvp.attendingWithCompanions", icon: "👥" },
    { value: "no", labelKey: "rsvp.notAttending", icon: "🚫" },
  ];

  return (
    <fieldset className="rv2-seg" disabled={frozen}>
      {/* legend accesible: agrupa y nombra el radiogroup */}
      <legend className="setup-label" id="rsvpAttendanceLegend">
        {t("rsvp.attendanceOptions")} *
      </legend>
      <div className="rv2-seg__track" role="radiogroup" aria-labelledby="rsvpAttendanceLegend">
        {options.map((o) => (
          <label key={o.value} className={"rv2-seg__opt" + (value === o.value ? " rv2-seg__opt--active" : "")}>
            {/* Radio real (accesible); el estilo visual lo pinta el label. */}
            <input
              className="rv2-seg__input"
              type="radio"
              name="rsvpAttendance"
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              disabled={frozen}
            />
            <span aria-hidden="true" className="rv2-seg__icon">
              {o.icon}
            </span>
            <span className="rv2-seg__label">{t(o.labelKey)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
});

export default AttendanceSelector;
