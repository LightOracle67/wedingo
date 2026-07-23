import { memo, useCallback } from "react";
import type { Attendee } from "../types";

interface AttendeeCardProps {
  attendee: Attendee;
  index: number;
  total: number;
  menuEnabled: boolean;
  onUpdate: (index: number, field: string, value: string | boolean | string[]) => void;
  onRemove: (index: number) => void;
  menus: string[];
  allergiesOptions: string[];
  t: (key: string, options?: Record<string, unknown>) => string;
}

const AttendeeCard = memo(function AttendeeCard({
  attendee, index, total, menuEnabled, onUpdate, onRemove, menus, allergiesOptions, t
}: AttendeeCardProps) {
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(index, "name", e.target.value),
    [index, onUpdate]
  );

  const handleMenuChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onUpdate(index, "menu", e.target.value),
    [index, onUpdate]
  );

  const handleAllergyToggle = useCallback(
    (allergy: string) => {
      const current = attendee.allergies ?? [];
      const updated = current.includes(allergy)
        ? current.filter((a: string) => a !== allergy)
        : [...current, allergy];
      onUpdate(index, "allergies", updated);
    },
    [index, attendee.allergies, onUpdate]
  );

  return (
    <div className="rsvp-attendee-card" role="group" aria-label={`${t("rsvp.attendee")} ${index + 1}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h4 style={{ margin: 0 }}>{t("rsvp.attendee")} {index + 1}</h4>
        {total > 1 && (
          <button type="button" className="setup-button setup-button--danger setup-button--compact"
            onClick={() => onRemove(index)} aria-label={t("rsvp.removeAttendee")}>
            ✕
          </button>
        )}
      </div>

      <div className="setup-field" style={{ marginBottom: "0.4rem" }}>
        <label className="setup-label" htmlFor={`attendee-name-${index}`}>{t("rsvp.name")}</label>
        <input id={`attendee-name-${index}`} className="setup-input" type="text"
          value={attendee.name ?? ""} onChange={handleNameChange}
          placeholder={t("rsvp.namePlaceholder")} required />
      </div>

      {menuEnabled && (
        <div className="setup-field" style={{ marginBottom: "0.4rem" }}>
          <label className="setup-label" htmlFor={`attendee-menu-${index}`}>{t("rsvp.menu")}</label>
          <select id={`attendee-menu-${index}`} className="setup-input"
            value={attendee.menu ?? ""} onChange={handleMenuChange}>
            <option value="">{t("rsvp.selectMenu")}</option>
            {menus.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      <fieldset style={{ border: "none", padding: 0, margin: "0.25rem 0" }}>
        <legend className="setup-label" style={{ fontSize: "0.85rem" }}>{t("rsvp.allergies")}</legend>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {allergiesOptions.map((a) => (
            <label key={a} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
              <input type="checkbox" checked={(attendee.allergies ?? []).includes(a)}
                onChange={() => handleAllergyToggle(a)} />
              {t(`allergies.${a}`, { defaultValue: a })}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
});

export default AttendeeCard;
