import { memo, useCallback, useMemo, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";
import type { Attendee } from "../../types";
import AttendeeCard from "../../components/AttendeeCard";

interface RsvpFormState {
  guestName: string;
  attendance: string;
  birthDate: string;
  attendees: { name: string; menu: string; allergies: string[] }[];
  parentalConsent: boolean;
  privacyConsent: boolean;
  healthConsent: boolean;
}

interface RsvpSectionProps {
  style?: React.CSSProperties;
  className?: string;
  rsvpForm: RsvpFormState;
  rsvpMessage?: string;
  isRsvpSubmitting?: boolean;
  hasSubmitted?: boolean;
  alreadySubmittedEntry?: unknown;
  updateRsvpField: (field: string, value: string | boolean | { name: string; menu: string; allergies: string[] }[]) => void;
  handleRsvpSubmit: (e: React.FormEvent) => void;
  handleDeleteRsvp: () => void;
  menuEnabled?: boolean;
  menuCarne?: string;
  menuPescado?: string;
  menuVegano?: string;
  menuPostre?: string;
  menuTexto?: string;
  computeAge: (birthDate: string) => number | null;
}

const RsvpSection = memo(function RsvpSection({
  style, className,
  rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,
  updateRsvpField, handleRsvpSubmit, handleDeleteRsvp, menuEnabled, menuCarne, menuPescado, menuVegano, menuPostre, menuTexto, computeAge,
}: RsvpSectionProps) {
  const { t } = useTranslation();
  const { setLegalModal } = useApp();

  const isAlreadySubmitted = !!alreadySubmittedEntry;
  const isDisabled = isRsvpSubmitting || hasSubmitted || isAlreadySubmitted;
  const attendees: { name: string; menu: string; allergies: string[] }[] = rsvpForm.attendees || [];

  const attendeesRef = useRef(attendees);
  attendeesRef.current = attendees;

  const age = useMemo(() => computeAge(rsvpForm.birthDate), [rsvpForm.birthDate, computeAge]);
  const isUnder14 = age !== null && age < 14;
  const hasDietaryData = attendees.some((a: { name: string; menu: string; allergies: string[] }) => a.allergies?.length > 0);
  const showHealthConsent = rsvpForm.attendance === "yes" && hasDietaryData;

  const hasStructuredMenu = menuEnabled && (menuCarne || menuPescado || menuVegano);

  const menuOptions = [
    ...(menuCarne ? [{ key: "carne" as const, label: t("rsvp.menuCarne"), desc: menuCarne }] : []),
    ...(menuPescado ? [{ key: "pescado" as const, label: t("rsvp.menuPescado"), desc: menuPescado }] : []),
    ...(menuVegano ? [{ key: "vegano" as const, label: t("rsvp.menuVegano"), desc: menuVegano }] : []),
  ];

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    updateRsvpField("guestName", e.target.value.slice(0, 120));
  }, [updateRsvpField]);

  const handleAttendanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    updateRsvpField("attendance", e.target.value);
  }, [updateRsvpField]);

  const handleBirthDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    updateRsvpField("birthDate", e.target.value);
  }, [updateRsvpField]);

  const handleParentalConsentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRsvpField("parentalConsent", e.target.checked);
  }, [updateRsvpField]);

  const handlePrivacyConsentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRsvpField("privacyConsent", e.target.checked);
  }, [updateRsvpField]);

  const handleHealthConsentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRsvpField("healthConsent", e.target.checked);
  }, [updateRsvpField]);

  const handleLegalClick = useCallback(() => {
    setLegalModal("privacy");
  }, [setLegalModal]);

  const addAttendee = useCallback(() => {
    const current = attendeesRef.current;
    updateRsvpField("attendees", [...current, { name: "", menu: "", allergies: [] }]);
  }, [updateRsvpField]);

  const removeAttendee = useCallback((idx: number) => {
    const current = attendeesRef.current;
    const next = current.filter((_, i: number) => i !== idx);
    updateRsvpField("attendees", next);
  }, [updateRsvpField]);

  const updateAttendee = useCallback((idx: number, field: string, value: string | boolean | string[]) => {
    const current = attendeesRef.current;
    const next = current.map((a, i: number) => i === idx ? { ...a, [field]: value } : a);
    updateRsvpField("attendees", next);
  }, [updateRsvpField]);

  return (
    <section data-story-section="rsvp" className={`${className} flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10`} style={style}>
      <div className="story-card story-panel story-card--rsvp allow-select w-full max-w-[min(100%,42rem)]">
        <p className="story-eyebrow text-center">{t("rsvp.sectionLabel")}</p>
        <h2 className="story-title text-center">{t("rsvp.title")}</h2>
        <p className="story-copy text-center">{t("rsvp.description")}</p>

        {isAlreadySubmitted ? (
          <div className="rsvp-already-badge" style={{
            textAlign: "center", padding: "0.5rem 1rem", marginBottom: "1rem",
            borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-accent) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--setup-accent) 30%, transparent)",
          }}>
            <p style={{ color: "var(--setup-accent)", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
              {t("rsvp.alreadySubmitted")}
            </p>
          </div>
        ) : null}

        <form className="rsvp-form" onSubmit={handleRsvpSubmit} noValidate>
          <label className="setup-label" htmlFor="rsvpName">{t("rsvp.nameLabel")} *</label>
          <input id="rsvpName" className="setup-input" value={rsvpForm.guestName} onChange={handleNameChange} placeholder={t("rsvp.namePlaceholder")} autoComplete="off" required disabled={isAlreadySubmitted} maxLength={120} />

          <div className="setup-date-grid rsvp-choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            <div>
              <label className="setup-label" htmlFor="rsvpAttendance">{t("rsvp.attendanceLabel")} *</label>
              <select id="rsvpAttendance" className="setup-input" value={rsvpForm.attendance} onChange={handleAttendanceChange} required disabled={isAlreadySubmitted}>
                <option value="yes">{t("rsvp.attending")}</option>
                <option value="no">{t("rsvp.notAttending")}</option>
              </select>
            </div>
          </div>

          {rsvpForm.attendance === "yes" && (
            <div style={{ marginTop: "0.75rem" }}>
              <p className="setup-label">{t("rsvp.attendeesLabel")}</p>
              {attendees.map((att, i: number) => (
                <AttendeeCard
                  key={i}
                  attendee={att as Attendee}
                  index={i}
                  total={attendees.length}
                  menuEnabled={!!hasStructuredMenu}
                  onUpdate={updateAttendee}
                  onRemove={removeAttendee}
                  menus={menuOptions.map((m) => m.key)}
                  allergiesOptions={["sin gluten", "sin lactosa", "alergia frutos secos", "alergia mariscos"]}
                  t={t}
                />
              ))}
              {!isAlreadySubmitted && (
                <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={addAttendee} style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  + {t("rsvp.addAttendee")}
                </button>
              )}
              {menuPostre?.trim() && hasStructuredMenu ? (
                <div style={{ marginTop: "0.5rem", padding: "0.5rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                  <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.15rem" }}>{t("rsvp.postre")}</p>
                  <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{menuPostre}</p>
                </div>
              ) : null}
            </div>
          )}

          {rsvpForm.attendance === "yes" && !menuEnabled ? (
            <p className="setup-help" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>{t("rsvp.allergiesHint")}</p>
          ) : null}

          {rsvpForm.attendance === "yes" && menuEnabled && !hasStructuredMenu && menuTexto?.trim() ? (
            <div style={{ marginBottom: "0.5rem", marginTop: "0.5rem", padding: "0.6rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
              <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>{t("rsvp.menuLabel")}</p>
              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{menuTexto}</p>
            </div>
          ) : null}

          {rsvpForm.attendance === "yes" && menuEnabled ? (
            <p className="setup-help" style={{ fontSize: "0.8rem" }}>{t("rsvp.allergiesHint")}</p>
          ) : null}

          <label className="setup-label" htmlFor="rsvpBirthDate" style={{ marginTop: "0.5rem" }}>{t("rsvp.birthDateLabel")} *</label>
          <input id="rsvpBirthDate" type="date" max={new Date().toISOString().split("T")[0]} className="setup-input" value={rsvpForm.birthDate} onChange={handleBirthDateChange} style={{ colorScheme: "light" }} required disabled={isAlreadySubmitted} />

          {isUnder14 ? (
            <p style={{ fontSize: "0.82rem", color: "#e88b2c", margin: "0.3rem 0" }}>{t("rsvp.ageUnder14Warning")}</p>
          ) : null}

          {isUnder14 ? (
            <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: isAlreadySubmitted ? "default" : "pointer", marginBottom: "0.5rem" }}>
              <input type="checkbox" checked={rsvpForm.parentalConsent} onChange={handleParentalConsentChange} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} required={isUnder14} disabled={isAlreadySubmitted} />
              <span>{t("rsvp.parentalConsent")}</span>
            </label>
          ) : null}

          <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: isAlreadySubmitted ? "default" : "pointer" }}>
            <input type="checkbox" checked={rsvpForm.privacyConsent} onChange={handlePrivacyConsentChange} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} required disabled={isAlreadySubmitted} />
            <span><Trans i18nKey="rsvp.privacyConsent" components={{ link: <button type="button" onClick={handleLegalClick} style={{ color: "var(--setup-accent)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }} /> }} /></span>
          </label>

          {showHealthConsent ? (
            <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: isAlreadySubmitted ? "default" : "pointer" }}>
              <input type="checkbox" checked={rsvpForm.healthConsent} onChange={handleHealthConsentChange} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} required={showHealthConsent} disabled={isAlreadySubmitted} />
              <span>{t("rsvp.healthConsent")}</span>
            </label>
          ) : null}

          {isAlreadySubmitted ? (
            <div className="setup-actions" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button className="setup-button" type="button" onClick={handleDeleteRsvp} style={{ background: "#ef4444", color: "#fff" }}>
                {t("rsvp.withdrawButton")}
              </button>
            </div>
          ) : (
            <div className="setup-actions">
              <button className="setup-button" type="submit" disabled={isDisabled}>
                {isRsvpSubmitting ? t("rsvp.submittingButton") : isDisabled ? t("rsvp.confirmedButton") : t("rsvp.submitButton")}
              </button>
            </div>
          )}
        </form>

        {rsvpMessage ? <p className="rsvp-feedback" aria-live="polite">{rsvpMessage}</p> : null}
      </div>
    </section>
  );
});

export default RsvpSection;
