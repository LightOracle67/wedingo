import { memo } from "react";
import TransportPicker from "./TransportPicker";
import { MenuPicker, AllergiesChips } from "./MenuAndAllergies";
import type { RsvpFormData } from "../../../hooks/useRsvp";
import type { Translate } from "./derive";

interface CompanionCardProps {
  index: number;
  form: RsvpFormData;
  /** Escribe cualquier campo indexado del formulario (companionNames[i], …). */
  onField: (field: string, value: unknown) => void;
  onRemove: (index: number) => void;
  /** Cambio de modo del acompañante i: el orquestador rellena salida/hora/lugar. */
  onModeChange: (index: number, mode: string) => void;
  /** Cambio de salida concreta del acompañante i. */
  onDepartureChange: (index: number, choiceIndex: string) => void;
  modes: { value: string; label: string }[];
  departures: { type?: "bus" | "taxi"; time: string; url: string }[];
  menuOptions: { key: string; label: string; desc: string }[];
  hasTransportChoices: boolean;
  hasStructuredMenu: boolean;
  frozen: boolean;
  t: Translate;
}

/**
 * Tarjeta de acompañante: nombre, transporte, menú, alergias y flag ¿niño?.
 * Toda escritura va por onField con la clave indexada que useRsvp ya sabe
 * interpretar (p. ej. "companionNames[0]"), así el estado sigue viviendo en
 * un único objeto rsvpForm.
 */
const CompanionCard = memo(function CompanionCard({
  index,
  form,
  onField,
  onRemove,
  onModeChange,
  onDepartureChange,
  modes,
  departures,
  menuOptions,
  hasTransportChoices,
  hasStructuredMenu,
  frozen,
  t,
}: CompanionCardProps) {
  const i = index;

  return (
    <section className="rv2-card" aria-label={t("rsvp.companionHeading", { number: i + 1 })}>
      <header className="rv2-card__head">
        <h3 className="rv2-card__title">{t("rsvp.companionHeading", { number: i + 1 })}</h3>
        {/* ✕ específico: elimina ESTE acompañante preservando los demás. */}
        <button
          type="button"
          className="rv2-x"
          aria-label={t("common.remove")}
          onClick={() => onRemove(i)}
          disabled={frozen}
        >
          ✕
        </button>
      </header>

      {/* Nombre */}
      <label className="setup-label rv2-sublabel" htmlFor={`companion-name-${i}`}>
        {t("rsvp.nameLabel")} *
      </label>
      <input
        id={`companion-name-${i}`}
        className="setup-input"
        type="text"
        value={form.companionNames[i] || ""}
        onChange={(e) => onField(`companionNames[${i}]`, e.target.value.slice(0, 120))}
        placeholder={t("rsvp.attendeeNamePlaceholder")}
        required
        disabled={frozen}
        maxLength={120}
      />

      {hasTransportChoices ? (
        <TransportPicker
          group={i}
          compact
          mode={form.companionTransportModes?.[i] || "own"}
          choice={form.companionTransportChoices?.[i] || ""}
          modes={modes}
          departures={departures}
          frozen={frozen}
          t={t}
          onModeChange={(mode) => onModeChange(i, mode)}
          onDepartureChange={(choiceIdx) => onDepartureChange(i, choiceIdx)}
        />
      ) : null}

      {hasStructuredMenu && menuOptions.length > 0 ? (
        <MenuPicker
          name={`rv2Menu${index}`}
          compact
          value={form.companionMenus[i] || ""}
          options={menuOptions}
          onChange={(k) => onField(`companionMenus[${i}]`, k)}
          frozen={frozen}
          t={t}
        />
      ) : null}

      <AllergiesChips
        idSuffix={`-${i}`}
        compact
        selected={form.companionAllergies[i] || []}
        other={form.companionAllergiesOther?.[i] || ""}
        onToggle={(a) => {
          const current = form.companionAllergies[i] || [];
          const updated = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
          onField(`companionAllergies[${i}]`, updated);
        }}
        onOtherChange={(v) => {
          const current = [...(form.companionAllergiesOther || [])];
          current[i] = v;
          onField("companionAllergiesOther", current);
        }}
        frozen={frozen}
        t={t}
      />

      {/* Consentimiento de salud del acompañante: obligatorio solo si declaró alergias. */}
      {(() => {
        const hasAllergies =
          (form.companionAllergies[i] || []).length > 0 || (form.companionAllergiesOther?.[i] || "").trim().length > 0;
        if (!hasAllergies) return null;
        return (
          <label className="rv2-check">
            <input
              type="checkbox"
              checked={form.companionHealthConsents?.[i] || false}
              required={hasAllergies}
              onChange={(e) => {
                const current = [...(form.companionHealthConsents || [])];
                current[i] = e.target.checked;
                onField("companionHealthConsents", current);
              }}
              disabled={frozen}
            />
            <span>{t("rsvp.healthConsent")}</span>
          </label>
        );
      })()}

      {/* ¿Es niño? Checkbox único toque (adulto = desmarcado). El label envuelve
          al input: añadir htmlFor duplicaría la activación. */}
      <label className="rv2-check">
        <input
          type="checkbox"
          checked={form.companionIsChildren?.[i] === "yes"}
          onChange={(e) => onField(`companionIsChildren[${i}]`, e.target.checked ? "yes" : "no")}
          disabled={frozen}
        />
        <span>{t("rsvp.childQuestion")}</span>
      </label>
    </section>
  );
});

export default CompanionCard;
