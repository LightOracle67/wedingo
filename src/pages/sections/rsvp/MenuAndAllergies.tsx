import { memo } from "react";
import Modal from "../../../components/Modal";
import { ALLERGIES } from "./constants";
import type { Translate } from "./derive";

interface MenuModalProps {
  /** Título del modal: etiqueta del menú abierto o la del bloque. */
  title: string;
  /** Platos formateados del menú (una línea por plato). */
  desc: string;
  /** Si es un menú elegible, se muestra el botón Elegir y el estado elegido. */
  selectable: boolean;
  /** Qué menú está elegido ahora (muestra el badge si coincide con este modal). */
  selected: boolean;
  /** Cierra el modal confirmando la elección (solo menús seleccionables). */
  onChoose?: (() => void) | undefined;
  /** Cierra el modal sin cambios. */
  onClose: () => void;
  t: Translate;
}

/**
 * Modal que muestra los platos de un menú. En los menús seleccionables el
 * invitado elige aquí (un único gesto: Elegir cierra y la selección queda
 * marcada en el botón exterior); en el menú fijo (texto libre) es solo
 * informativo y se cierra con el botón de cerrar.
 */
const MenuModal = memo(function MenuModal({ title, desc, selectable, selected, onChoose, onClose, t }: MenuModalProps) {
  return (
    <Modal title={title} closeLabel={t("common.close")} onClose={onClose} style={{ maxWidth: "min(95vw, 480px)" }}>
      {selectable && selected ? (
        <p className="rv2-menu-badge" role="status">
          {t("rsvp.menuChosenBadge")}
        </p>
      ) : null}
      {/* Platos formateados: se conserva el salto de línea de cada plato. */}
      <pre className="story-note whitespace-pre-line rv2-menu-desc" style={{ font: "inherit", whiteSpace: "pre-line" }}>
        {desc}
      </pre>
      {selectable && onChoose ? (
        <button type="button" className="setup-button rv2-menu-choose" onClick={onChoose}>
          {t("rsvp.chooseMenu")}
        </button>
      ) : null}
    </Modal>
  );
});

export { MenuModal };

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
