import { memo } from "react";
import { ALLERGIES } from "./constants";
import type { Translate } from "./derive";

interface MenuPickerProps {
  /** Nombre único del grupo de radios: main y cada acompañante necesitan el suyo. */
  name: string;
  /** Valor seleccionado (clave de menú o ""). */
  value: string;
  options: { key: string; label: string; desc: string }[];
  onChange: (key: string) => void;
  frozen: boolean;
  compact?: boolean;
  t: Translate;
}

/**
 * Selector de menú tipo tarjetas-radio: cada opción muestra su etiqueta y,
 * al estar activa, la descripción de platos desplegada debajo (antes era un
 * select + panel separado, menos descubrible).
 */
const MenuPicker = memo(function MenuPicker({ value, options, onChange, frozen, compact, t, name }: MenuPickerProps) {
  const selected = options.find((m) => m.key === value) || null;
  return (
    <fieldset className={"rv2-menu" + (compact ? " rv2-compact" : "")} disabled={frozen}>
      <legend className="rv2-menu__title">{t("rsvp.menuLabel")}</legend>
      <div className="rv2-menulist" role="radiogroup">
        {options.map((m) => {
          const active = value === m.key;
          return (
            <label key={m.key} className={"rv2-menu__opt" + (active ? " rv2-menu__opt--active" : "")}>
              <input
                type="radio"
                name={name}
                className="rv2-seg__input"
                value={m.key}
                checked={active}
                onChange={() => onChange(m.key)}
                disabled={frozen}
              />
              <span className="rv2-menu__label">{m.label}</span>
            </label>
          );
        })}
      </div>
      {/* El menú elegido se detalla en una etiqueta propia, separada de las
          tarjetas: antes la descripción se expandía dentro del label del
          radio y estiraba la tarjeta (error visual) al seleccionar. */}
      {selected ? (
        <div className="rv2-menu__sel" role="status">
          <span className="rv2-menu__sel-label">{t("rsvp.menuSelected", { m: selected.label })}</span>
          {selected.desc ? <span className="rv2-menu__desc">{selected.desc}</span> : null}
        </div>
      ) : null}
    </fieldset>
  );
});

export { MenuPicker };

/** Chips de alergías reutilizables (titular y acompañantes). */
export const AllergiesChips = memo(function AllergiesChips({
  selected,
  other,
  onToggle,
  onOtherChange,
  frozen,
  idSuffix = "",
  compact,
  t,
}: {
  selected: string[];
  other: string;
  onToggle: (allergy: string) => void;
  onOtherChange: (value: string) => void;
  frozen: boolean;
  idSuffix?: string;
  compact?: boolean;
  t: Translate;
}) {
  return (
    <fieldset className={"rv2-allergies" + (compact ? " rv2-compact" : "")} disabled={frozen}>
      <legend className="setup-label rv2-sublabel">{t("rsvp.allergiesLegend")}</legend>
      <div className="rv2-chiprow">
        {ALLERGIES.map((a) => {
          const on = selected.includes(a);
          return (
            // Chip-checkbox: mismo lenguaje visual que el transporte.
            <label key={a} className={"rv2-chip" + (on ? " rv2-chip--on" : "")}>
              <input type="checkbox" checked={on} onChange={() => onToggle(a)} disabled={frozen} />
              {t(`rsvp.allergies.${a}`, { defaultValue: a })}
            </label>
          );
        })}
      </div>
      <label className="sr-only" htmlFor={`rv2OtherAllergies${idSuffix}`}>
        {t("rsvp.allergiesOtherLabel")}
      </label>
      <input
        id={`rv2OtherAllergies${idSuffix}`}
        className="setup-input rv2-other"
        type="text"
        value={other}
        onChange={(e) => onOtherChange(e.target.value.slice(0, 200))}
        placeholder={t("rsvp.allergiesPlaceholder")}
        disabled={frozen}
      />
    </fieldset>
  );
});
