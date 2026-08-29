import { memo } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../../components/Modal";
import { ALLERGIES } from "../sections/rsvp/constants";
import { departureLabel, type Departure } from "../sections/rsvp/derive";
import { type EditingCompanion, type EditingState } from "./attendance-edit-types";

/** Props del modal de edición/alta manual de un invitado. */
interface AttendanceEditModalProps {
  editing: EditingState;
  savingManual: boolean;
  menuEnabled: boolean;
  departuresList: Departure[];
  onClose: () => void;
  onSave: () => void;
  onChange: <K extends keyof EditingState>(key: K, value: EditingState[K]) => void;
  onAddCompanion: () => void;
  onRemoveCompanion: (index: number) => void;
  onPatchCompanion: (index: number, patch: Partial<EditingCompanion>) => void;
  onToggleCompanionAllergy: (index: number, allergy: string) => void;
}

/**
 * Cuadro de edición del panel de asistencias: permite corregir cualquier
 * campo de un invitado principal (nombre, asistencia, menú, alergias,
 * transporte y su lista de acompañantes), también para respuestas enviadas
 * por los propios invitados. Se separa del tab para no acoplarlo a su lógica.
 */
function AttendanceEditModalBase({
  editing,
  savingManual,
  menuEnabled,
  departuresList,
  onClose,
  onSave,
  onChange,
  onAddCompanion,
  onRemoveCompanion,
  onPatchCompanion,
  onToggleCompanionAllergy,
}: AttendanceEditModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      title={editing.id ? t("attendance.manualEditTitle") : t("attendance.manualAddTitle")}
      closeLabel={t("common.close")}
      onClose={onClose}
      style={{ maxWidth: "560px" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <label className="setup-label" htmlFor="manualRsvpName">
          {t("attendance.manualNameLabel")}
        </label>
        <input
          id="manualRsvpName"
          className="setup-input"
          value={editing.name}
          onChange={(e) => onChange("name", e.target.value)}
          maxLength={120}
          placeholder={t("attendance.manualNamePlaceholder")}
          disabled={savingManual}
        />
        <label className="setup-label" htmlFor="manualRsvpAttendance" style={{ marginTop: "0.6rem" }}>
          {t("attendance.manualAttendanceLabel")}
        </label>
        <select
          id="manualRsvpAttendance"
          className="setup-input"
          value={editing.attendance}
          onChange={(e) => onChange("attendance", e.target.value as "yes" | "no")}
          disabled={savingManual}
        >
          <option value="yes">{t("attendance.filterYes")}</option>
          <option value="no">{t("attendance.filterNo")}</option>
        </select>

        {/* Solo si asiste: menú, alergias y transporte. */}
        {editing.attendance === "yes" ? (
          <>
            {menuEnabled ? (
              <>
                <label className="setup-label" htmlFor="manualRsvpMeal" style={{ marginTop: "0.6rem" }}>
                  {t("rsvp.menuLabel")}
                </label>
                <select
                  id="manualRsvpMeal"
                  className="setup-input"
                  value={editing.mealChoice}
                  onChange={(e) => onChange("mealChoice", e.target.value)}
                  disabled={savingManual}
                >
                  <option value="">{t("rsvp.menuPlaceholder")}</option>
                  <option value="carne">{t("rsvp.menuCarne")}</option>
                  <option value="pescado">{t("rsvp.menuPescado")}</option>
                  <option value="vegano">{t("rsvp.menuVegano")}</option>
                </select>
              </>
            ) : null}
            <fieldset style={{ border: "none", padding: 0, marginTop: "0.6rem" }}>
              <legend className="setup-label">{t("rsvp.allergiesLegend")}</legend>
              {ALLERGIES.map((a) => (
                <label key={a} className="setup-checkbox-label" style={{ fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={editing.allergySelection.includes(a)}
                    onChange={(e) =>
                      onChange(
                        "allergySelection",
                        e.target.checked
                          ? [...editing.allergySelection, a]
                          : editing.allergySelection.filter((x) => x !== a),
                      )
                    }
                  />
                  {t("rsvp.allergies." + a)}
                </label>
              ))}
              <input
                className="setup-input"
                value={editing.allergyOther}
                onChange={(e) => onChange("allergyOther", e.target.value)}
                maxLength={200}
                placeholder={t("rsvp.allergiesPlaceholder")}
                style={{ marginTop: "0.3rem" }}
                disabled={savingManual}
              />
            </fieldset>
            <label className="setup-label" htmlFor="manualRsvpTransport" style={{ marginTop: "0.6rem" }}>
              {t("rsvp.transportLabel")}
            </label>
            <select
              id="manualRsvpTransport"
              className="setup-input"
              value={editing.transportMode}
              onChange={(e) => onChange("transportMode", e.target.value)}
              disabled={savingManual}
            >
              <option value="own">{t("rsvp.transportOwnCarOption")}</option>
              <option value="bus">{t("rsvp.transportBusOption")}</option>
              <option value="taxi">{t("rsvp.transportTaxiOption")}</option>
            </select>
            {editing.transportMode !== "own" && departuresList.length > 0 ? (
              <>
                <label className="setup-label" htmlFor="manualRsvpDeparture" style={{ marginTop: "0.6rem" }}>
                  {t("rsvp.transportDepartureLabel")}
                </label>
                <select
                  id="manualRsvpDeparture"
                  className="setup-input"
                  value={editing.transportChoice}
                  onChange={(e) => onChange("transportChoice", e.target.value)}
                  disabled={savingManual}
                >
                  {departuresList.map((d, i) => (
                    <option key={String(i)} value={String(i)}>
                      {departureLabel(d, t)}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {/* Acompañantes: lista editable con todos sus campos. */}
            <fieldset style={{ border: "none", padding: 0, marginTop: "0.6rem" }}>
              <legend className="setup-label">{t("attendance.manualCompanionsLabel")}</legend>
              {editing.companions.map((comp, ci) => (
                <div
                  key={String(ci)}
                  style={{
                    border: "1px solid var(--setup-border)",
                    borderRadius: "8px",
                    padding: "0.5rem",
                    marginBottom: "0.4rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                    <input
                      className="setup-input"
                      style={{ flex: 1 }}
                      value={comp.name}
                      onChange={(e) => onPatchCompanion(ci, { name: e.target.value })}
                      maxLength={120}
                      placeholder={t("attendance.manualNamePlaceholder")}
                      aria-label={`${t("attendance.manualCompanionsLabel")} ${ci + 1} - ${t("attendance.manualNameLabel")}`}
                    />
                    <button
                      type="button"
                      className="setup-button setup-button--ghost setup-button--compact"
                      onClick={() => onRemoveCompanion(ci)}
                      aria-label={`${t("attendance.manualRemoveCompanion")} ${ci + 1}`}
                      title={t("attendance.manualRemoveCompanion")}
                    >
                      ✕
                    </button>
                  </div>
                  {menuEnabled ? (
                    <select
                      className="setup-input"
                      value={comp.menu}
                      onChange={(e) => onPatchCompanion(ci, { menu: e.target.value })}
                      aria-label={`${t("attendance.manualCompanionsLabel")} ${ci + 1} - ${t("rsvp.menuLabel")}`}
                    >
                      <option value="">{t("rsvp.menuPlaceholder")}</option>
                      <option value="carne">{t("rsvp.menuCarne")}</option>
                      <option value="pescado">{t("rsvp.menuPescado")}</option>
                      <option value="vegano">{t("rsvp.menuVegano")}</option>
                    </select>
                  ) : null}
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                    {ALLERGIES.map((a) => (
                      <label key={a} className="setup-checkbox-label" style={{ fontWeight: 400, fontSize: "0.85rem" }}>
                        <input
                          type="checkbox"
                          checked={comp.allergies.includes(a)}
                          onChange={() => onToggleCompanionAllergy(ci, a)}
                        />
                        {t("rsvp.allergies." + a)}
                      </label>
                    ))}
                    <input
                      className="setup-input"
                      style={{ flex: 1, minWidth: "8rem" }}
                      value={comp.other}
                      onChange={(e) => onPatchCompanion(ci, { other: e.target.value })}
                      maxLength={200}
                      placeholder={t("rsvp.allergiesPlaceholder")}
                      aria-label={`${t("attendance.manualCompanionsLabel")} ${ci + 1} - ${t("rsvp.allergiesPlaceholder")}`}
                    />
                  </div>
                </div>
              ))}
              <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={onAddCompanion}>
                {t("attendance.manualAddCompanion")}
              </button>
            </fieldset>
          </>
        ) : null}

        <div className="setup-actions" style={{ marginTop: "0.8rem" }}>
          <button className="setup-button" type="submit" disabled={savingManual || !editing.name.trim()}>
            {savingManual
              ? t("common.loading")
              : editing.id
                ? t("attendance.manualSave")
                : t("attendance.manualAdd")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Modal de edición de invitado (memoizado: solo re-renderiza si cambian props). */
export const AttendanceEditModal = memo(AttendanceEditModalBase);
