import { memo, useCallback, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useApp } from "../../contexts";

const ALLERGIES = ["sin gluten", "sin lactosa", "alergia a frutos secos", "alergia a mariscos"];

interface RsvpFormState {
  guestName: string;
  attendance: string;
  birthDate: string;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  menuSelection: string;
  allergies: string[];
  allergiesOther: string;
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
  updateRsvpField: (field: string, value: string | boolean | number | string[] | string[][]) => void;
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
  const isAttending = rsvpForm.attendance !== "no";

  const age = useMemo(() => computeAge(rsvpForm.birthDate), [rsvpForm.birthDate, computeAge]);
  const isUnder14 = age !== null && age < 14;
  const hasDietaryData = (rsvpForm.allergies || []).length > 0;
  const showHealthConsent = isAttending && hasDietaryData;

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

  const handleCompanionNameChange = useCallback((idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateRsvpField(`companionNames[${idx}]`, e.target.value.slice(0, 120));
  }, [updateRsvpField]);

  const handleMenuChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateRsvpField("menuSelection", e.target.value);
  }, [updateRsvpField]);

  const handleAllergyToggle = useCallback((allergy: string) => {
    const current = rsvpForm.allergies || [];
    const updated = current.includes(allergy)
      ? current.filter((a: string) => a !== allergy)
      : [...current, allergy];
    updateRsvpField("allergies", updated);
  }, [rsvpForm.allergies, updateRsvpField]);

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
              <label className="setup-label" htmlFor="rsvpAttendance">{t("rsvp.attendanceOptions")} *</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <select id="rsvpAttendance" className="setup-input" value={rsvpForm.attendance} onChange={handleAttendanceChange} required disabled={isAlreadySubmitted} style={{ width: "auto", minWidth: "180px" }}>
                  <option value="alone">{t("rsvp.attendingAlone")}</option>
                  <option value="with">{t("rsvp.attendingWithCompanions")}</option>
                  <option value="no">{t("rsvp.notAttending")}</option>
                </select>
                {rsvpForm.attendance === "with" && !isAlreadySubmitted && (rsvpForm.companionCount || 0) < 10 && (
                  <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => updateRsvpField("companionCount", (rsvpForm.companionCount || 0) + 1)} style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                    + {t("rsvp.addCompanion")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {rsvpForm.attendance === "with" && rsvpForm.companionCount > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              {Array.from({ length: rsvpForm.companionCount }, (_, i) => (
                <div key={i} className="rsvp-attendee-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <h4 style={{ margin: 0 }}>{t("rsvp.companionHeading", { number: i + 1 })}</h4>
                    {i > 0 && (
                      <button type="button" className="rsvp-remove-btn" aria-label={t("common.remove", "Remove")}
                        onClick={() => updateRsvpField("companionCount", rsvpForm.companionCount - 1)}
                        disabled={isAlreadySubmitted}>
                        ✕
                      </button>
                    )}
                  </div>

                  <label className="setup-label" htmlFor={`companion-name-${i}`}>{t("rsvp.nameLabel")} *</label>
                  <input id={`companion-name-${i}`} className="setup-input" type="text"
                    value={rsvpForm.companionNames[i] || ""}
                    onChange={handleCompanionNameChange(i)}
                    placeholder={t("rsvp.attendeeNamePlaceholder")} required disabled={isAlreadySubmitted} maxLength={120} />

                  {hasStructuredMenu && (
                    <>
                      <label className="setup-label" htmlFor={`companion-menu-${i}`} style={{ marginTop: "0.5rem" }}>{t("rsvp.menuLabel")}</label>
                      <select id={`companion-menu-${i}`} className="setup-input"
                        value={rsvpForm.companionMenus[i] || ""}
                        onChange={(e) => updateRsvpField(`companionMenus[${i}]`, e.target.value)}
                        disabled={isAlreadySubmitted}>
                        <option value="">{t("rsvp.menuPlaceholder")}</option>
                        {menuOptions.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                      </select>
                      {rsvpForm.companionMenus[i] ? (
                        <div style={{
                          marginTop: "0.35rem", padding: "0.4rem 0.6rem", borderRadius: "0.5rem",
                          background: "color-mix(in srgb, var(--setup-accent) 8%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--setup-accent) 15%, transparent)",
                          fontSize: "0.8rem", lineHeight: 1.4, color: "var(--setup-title, #fdf8ec)",
                        }}>
                          {menuOptions.find((m) => m.key === rsvpForm.companionMenus[i])?.desc}
                        </div>
                      ) : null}
                    </>
                  )}

                  <fieldset style={{ border: "none", padding: 0, margin: "0.5rem 0 0 0" }}>
                    <legend className="setup-label" style={{ fontSize: "0.85rem" }}>{t("rsvp.allergiesLegend")}</legend>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {ALLERGIES.map((a) => (
                        <label key={a} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: isDisabled ? "default" : "pointer" }}>
                          <input type="checkbox" checked={(rsvpForm.companionAllergies[i] || []).includes(a)}
                            onChange={() => {
                              const current = rsvpForm.companionAllergies[i] || [];
                              const updated = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
                              updateRsvpField(`companionAllergies[${i}]`, updated);
                            }}
                            disabled={isAlreadySubmitted} />
                          {t(`allergies.${a}`, { defaultValue: a })}
                        </label>
                      ))}
                    </div>
                    <input className="setup-input" type="text" value={rsvpForm.companionAllergiesOther?.[i] || ""}
                      onChange={(e) => {
                        const current = [...(rsvpForm.companionAllergiesOther || [])];
                        current[i] = e.target.value.slice(0, 200);
                        updateRsvpField("companionAllergiesOther", current);
                      }}
                      placeholder={t("rsvp.allergiesPlaceholder")} disabled={isAlreadySubmitted}
                      style={{ marginTop: "0.35rem", fontSize: "0.85rem" }} />
                  </fieldset>
                </div>
              ))}
            </div>
          )}

          {isAttending && hasStructuredMenu && (
            <div className="setup-field" style={{ marginTop: "0.75rem" }}>
              <label className="setup-label" htmlFor="rsvpMenu">{t("rsvp.menuLabel")} *</label>
              <select id="rsvpMenu" className="setup-input"
                value={rsvpForm.menuSelection} onChange={handleMenuChange} required disabled={isAlreadySubmitted}>
                <option value="">{t("rsvp.menuPlaceholder")}</option>
                {menuOptions.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              {rsvpForm.menuSelection ? (
                <div style={{
                  marginTop: "0.35rem", padding: "0.4rem 0.6rem", borderRadius: "0.5rem",
                  background: "color-mix(in srgb, var(--setup-accent) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--setup-accent) 15%, transparent)",
                  fontSize: "0.8rem", lineHeight: 1.4, color: "var(--setup-title, #fdf8ec)",
                }}>
                  {menuOptions.find((m) => m.key === rsvpForm.menuSelection)?.desc}
                </div>
              ) : null}
            </div>
          )}

          {isAttending && !menuEnabled ? (
            <p className="setup-help" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>{t("rsvp.allergiesHint")}</p>
          ) : null}

          {isAttending && menuEnabled && !hasStructuredMenu && menuTexto?.trim() ? (
            <div style={{ marginBottom: "0.5rem", marginTop: "0.5rem", padding: "0.6rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
              <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>{t("rsvp.menuLabel")}</p>
              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{menuTexto}</p>
            </div>
          ) : null}

          {isAttending && menuEnabled ? (
            <p className="setup-help" style={{ fontSize: "0.8rem" }}>{t("rsvp.allergiesHint")}</p>
          ) : null}

          {isAttending && (
            <fieldset style={{ border: "none", padding: 0, margin: "0.5rem 0 0 0" }}>
              <legend className="setup-label" style={{ fontSize: "0.85rem" }}>{t("rsvp.allergiesLegend")}</legend>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {ALLERGIES.map((a) => (
                  <label key={a} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: isDisabled ? "default" : "pointer" }}>
                    <input type="checkbox" checked={(rsvpForm.allergies || []).includes(a)}
                      onChange={() => handleAllergyToggle(a)} disabled={isAlreadySubmitted} />
                    {t(`allergies.${a}`, { defaultValue: a })}
                  </label>
                ))}
              </div>
              <input className="setup-input" type="text" value={rsvpForm.allergiesOther || ""}
                onChange={(e) => updateRsvpField("allergiesOther", e.target.value.slice(0, 200))}
                placeholder={t("rsvp.allergiesPlaceholder")} disabled={isAlreadySubmitted}
                style={{ marginTop: "0.35rem", fontSize: "0.85rem" }} />
            </fieldset>
          )}

          {menuPostre?.trim() && hasStructuredMenu ? (
            <div style={{ marginTop: "0.5rem", padding: "0.5rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
              <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.15rem" }}>{t("rsvp.postre")}</p>
              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{menuPostre}</p>
            </div>
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
