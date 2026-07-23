import { memo, useCallback, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";

const DIETARY_OPTIONS = [
  { value: "sin gluten", label: "Gluten" },
  { value: "sin lactosa", label: "Lactosa" },
  { value: "alergia frutos secos", label: "F. Secos" },
  { value: "alergia mariscos", label: "Mariscos" },
];

const MENU_KEYS = ["carne", "pescado", "vegano"] as const;

const RsvpSection = memo(function RsvpSection({
  style, className,
  rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,
  updateRsvpField, handleRsvpSubmit, handleDeleteRsvp, menuEnabled, menuCarne, menuPescado, menuVegano, menuPostre, menuTexto, computeAge,
}: any) {
  const { t } = useTranslation();
  const { setLegalModal } = useApp();

  const isAlreadySubmitted = !!alreadySubmittedEntry;
  const isDisabled = isRsvpSubmitting || hasSubmitted || isAlreadySubmitted;
  const attendees: any[] = rsvpForm.attendees || [];

  const age = useMemo(() => computeAge(rsvpForm.birthDate), [rsvpForm.birthDate, computeAge]);
  const isUnder14 = age !== null && age < 14;
  const hasDietaryData = attendees.some((a: any) => a.allergies?.length > 0);
  const showHealthConsent = rsvpForm.attendance === "yes" && hasDietaryData;

  const hasStructuredMenu = menuEnabled && (menuCarne || menuPescado || menuVegano);

  const menuOptions = [
    ...(menuCarne ? [{ key: "carne" as const, label: t("rsvp.menuCarne"), desc: menuCarne }] : []),
    ...(menuPescado ? [{ key: "pescado" as const, label: t("rsvp.menuPescado"), desc: menuPescado }] : []),
    ...(menuVegano ? [{ key: "vegano" as const, label: t("rsvp.menuVegano"), desc: menuVegano }] : []),
  ];

  const handleNameChange = useCallback((e: any) => {
    updateRsvpField("guestName", e.target.value.slice(0, 120));
  }, [updateRsvpField]);

  const handleAttendanceChange = useCallback((e: any) => {
    updateRsvpField("attendance", e.target.value);
  }, [updateRsvpField]);

  const handleBirthDateChange = useCallback((e: any) => {
    updateRsvpField("birthDate", e.target.value);
  }, [updateRsvpField]);

  const handleParentalConsentChange = useCallback((e: any) => {
    updateRsvpField("parentalConsent", e.target.checked);
  }, [updateRsvpField]);

  const handlePrivacyConsentChange = useCallback((e: any) => {
    updateRsvpField("privacyConsent", e.target.checked);
  }, [updateRsvpField]);

  const handleHealthConsentChange = useCallback((e: any) => {
    updateRsvpField("healthConsent", e.target.checked);
  }, [updateRsvpField]);

  const handleLegalClick = useCallback(() => {
    setLegalModal("privacy");
  }, [setLegalModal]);

  const addAttendee = useCallback(() => {
    updateRsvpField("attendees", [...attendees, { name: "", menu: "", allergies: [] }]);
  }, [attendees, updateRsvpField]);

  const removeAttendee = useCallback((idx: number) => {
    const next = attendees.filter((_: any, i: number) => i !== idx);
    updateRsvpField("attendees", next);
  }, [attendees, updateRsvpField]);

  const updateAttendee = useCallback((idx: number, field: string, value: any) => {
    const next = attendees.map((a: any, i: number) => i === idx ? { ...a, [field]: value } : a);
    updateRsvpField("attendees", next);
  }, [attendees, updateRsvpField]);

  const toggleAllergy = useCallback((idx: number, value: string) => {
    const a = attendees[idx];
    if (!a) return;
    const exists = a.allergies?.includes(value);
    const next = attendees.map((att: any, i: number) =>
      i === idx ? { ...att, allergies: exists ? att.allergies.filter((v: string) => v !== value) : [...(att.allergies || []), value] } : att
    );
    updateRsvpField("attendees", next);
  }, [attendees, updateRsvpField]);

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
              {attendees.map((att: any, i: number) => (
                <div key={i} style={{
                  border: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)",
                  borderRadius: "0.6rem", padding: "0.6rem", marginBottom: "0.5rem",
                  background: "color-mix(in srgb, var(--setup-field-bg) 40%, transparent)",
                  position: "relative",
                }}>
                  <button type="button" onClick={() => removeAttendee(i)} disabled={isAlreadySubmitted}
                    style={{ position: "absolute", top: "0.3rem", right: "0.3rem", width: "1.4rem", height: "1.4rem", border: "none", borderRadius: "50%", background: "rgba(0,0,0,0.4)", color: "#fff", cursor: "pointer", fontSize: "0.8rem", display: "grid", placeItems: "center", lineHeight: 1 }}>
                    ×
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <input className="setup-input" placeholder={t("rsvp.attendeeNamePlaceholder")} value={att.name || ""}
                      onChange={(e) => updateAttendee(i, "name", e.target.value.slice(0, 80))} disabled={isAlreadySubmitted}
                      style={{ fontSize: "0.85rem", padding: "0.35rem 0.5rem" }} />
                    {hasStructuredMenu ? (
                      <select className="setup-input" value={att.menu || ""} onChange={(e) => updateAttendee(i, "menu", e.target.value)}
                        disabled={isAlreadySubmitted} style={{ fontSize: "0.85rem", padding: "0.35rem 0.5rem" }}>
                        <option value="">{t("rsvp.menuPlaceholder")}</option>
                        {menuOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label} — {opt.desc}</option>
                        ))}
                      </select>
                    ) : null}
                    <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.2rem" }}>
                      {DIETARY_OPTIONS.map((opt) => (
                        <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.78rem", color: "var(--setup-title)", cursor: isAlreadySubmitted ? "default" : "pointer" }}>
                          <input type="checkbox" checked={att.allergies?.includes(opt.value) || false} onChange={() => toggleAllergy(i, opt.value)} disabled={isAlreadySubmitted}
                            style={{ accentColor: "var(--setup-accent)", width: "0.85rem", height: "0.85rem", flexShrink: 0 }} />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
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
