import { memo, useCallback, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";

const RsvpSection = memo(function RsvpSection({
  style, className,
  rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,
  updateRsvpField, handleRsvpSubmit, handleDeleteRsvp, handleDietaryToggle, DIETARY_OPTIONS, menuEnabled, menuCarne, menuPescado, menuVegano, menuPostre, menuTexto, computeAge,
}: any) {
  const { t } = useTranslation();
  const { setLegalModal } = useApp();

  const isAlreadySubmitted = !!alreadySubmittedEntry;
  const isDisabled = isRsvpSubmitting || hasSubmitted || isAlreadySubmitted;

  const age = useMemo(() => computeAge(rsvpForm.birthDate), [rsvpForm.birthDate, computeAge]);
  const isUnder14 = age !== null && age < 14;
  const hasDietaryData = rsvpForm.dietarySelection.length > 0 || rsvpForm.dietaryOther.trim() !== "";
  const showHealthConsent = rsvpForm.attendance === "yes" && hasDietaryData;

  const hasStructuredMenu = menuEnabled && (menuCarne || menuPescado || menuVegano);
  const companions = parseInt(rsvpForm.companions, 10) || 0;
  const totalGuests = 1 + companions;

  const guestNamesCount = (rsvpForm.guestNames || "").split(",").filter((n: any) => n.trim()).length;
  const namesExceed = guestNamesCount > companions;

  const updateHeadcount = useCallback((key: any, val: any) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    updateRsvpField("menuHeadcounts", { ...(rsvpForm.menuHeadcounts || {}), [key]: num });
  }, [updateRsvpField, rsvpForm.menuHeadcounts]);

  const menuOptions = [
    ...(menuCarne ? [{ key: "carne", label: t("rsvp.menuCarne"), desc: menuCarne }] : []),
    ...(menuPescado ? [{ key: "pescado", label: t("rsvp.menuPescado"), desc: menuPescado }] : []),
    ...(menuVegano ? [{ key: "vegano", label: t("rsvp.menuVegano"), desc: menuVegano }] : []),
  ];

  const hcs = rsvpForm.menuHeadcounts || {};
  const headcountSum: any = Object.values(hcs).reduce((a: any, b: any) => a + (b || 0), 0);
  const headcountExceed = headcountSum > companions;

  // ── Handlers extraídos (P-1 A) ───────────────────────

  const handleNameChange = useCallback((e: any) => {
    updateRsvpField("guestName", e.target.value.slice(0, 120));
  }, [updateRsvpField]);

  const handleAttendanceChange = useCallback((e: any) => {
    updateRsvpField("attendance", e.target.value);
  }, [updateRsvpField]);

  const handleCompanionsChange = useCallback((e: any) => {
    updateRsvpField("companions", Math.max(0, parseInt(e.target.value, 10) || 0));
  }, [updateRsvpField]);

  const handleGuestNamesChange = useCallback((e: any) => {
    updateRsvpField("guestNames", e.target.value.slice(0, 500));
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

  const handleDietaryOtherChange = useCallback((e: any) => {
    updateRsvpField("dietaryOther", e.target.value.slice(0, 120));
  }, [updateRsvpField]);

  const handleHeadcountChange = useCallback((e: any) => {
    const key = e.currentTarget.dataset.headcountKey;
    updateHeadcount(key, e.target.value);
  }, [updateHeadcount]);

  const handleDietaryChange = useCallback((e: any) => {
    handleDietaryToggle(e.currentTarget.value);
  }, [handleDietaryToggle]);

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
          <input id="rsvpName" className="setup-input" value={rsvpForm.guestName} onChange={handleNameChange} placeholder={t("rsvp.namePlaceholder")} autoComplete="off" required disabled={isAlreadySubmitted} />

          <div className="setup-date-grid rsvp-choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            <div>
              <label className="setup-label" htmlFor="rsvpAttendance">{t("rsvp.attendanceLabel")} *</label>
              <select id="rsvpAttendance" className="setup-input" value={rsvpForm.attendance} onChange={handleAttendanceChange} required disabled={isAlreadySubmitted}>
                <option value="yes">{t("rsvp.attending")}</option>
                <option value="no">{t("rsvp.notAttending")}</option>
              </select>
            </div>
            {rsvpForm.attendance === "yes" ? (
              <div>
                <label className="setup-label" htmlFor="rsvpCompanions">{t("rsvp.companionsLabel")} *</label>
                <input id="rsvpCompanions" type="number" min="0" max="50" className="setup-input"
                  value={rsvpForm.companions} onChange={handleCompanionsChange}
                  required disabled={isAlreadySubmitted} />
              </div>
            ) : null}
          </div>

          {rsvpForm.attendance === "yes" && companions > 0 ? (
            <div>
              <label className="setup-label" htmlFor="rsvpGuestNames">{t("rsvp.guestNamesLabel")} *</label>
              <p className="setup-help" style={{ fontSize: "0.78rem", marginBottom: "0.25rem" }}>
                {t("rsvp.guestNamesHint", { count: companions })}
              </p>
              <textarea
                id="rsvpGuestNames"
                className="setup-textarea"
                value={rsvpForm.guestNames || ""}
                onChange={handleGuestNamesChange}
                placeholder={t("rsvp.guestNamesPlaceholder")}
                rows={Math.min(companions, 6)}
                required
                disabled={isAlreadySubmitted}
                aria-invalid={namesExceed ? "true" : undefined}
                style={namesExceed ? { borderColor: "#ef4444" } : {}}
              />
              {namesExceed ? (
                <p role="alert" style={{ fontSize: "0.78rem", color: "#ef4444", marginTop: "0.15rem" }}>
                  {t("rsvp.guestNamesExceed", { max: companions })}
                </p>
              ) : null}
            </div>
          ) : null}

          {rsvpForm.attendance === "yes" && hasStructuredMenu ? (
            <fieldset style={{ border: "none", padding: 0, margin: "0.5rem 0 0", minInlineSize: 0 }}>
              <legend className="setup-label" style={{ marginBottom: "0.3rem" }}>{t("rsvp.menuLegend")} *</legend>
              <p className="setup-help" style={{ marginBottom: "0.4rem", fontSize: "0.8rem" }}>
                {t("rsvp.headcountHint", { total: totalGuests })}
              </p>
              {menuOptions.map((opt) => (
                <div key={opt.key} style={{ marginBottom: "0.4rem", padding: "0.5rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 15%, transparent)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.1rem" }}>{opt.label}</p>
                      <p className="story-note whitespace-pre-line" style={{ fontSize: "0.8rem", margin: 0 }}>{opt.desc}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                      <label style={{ fontSize: "0.78rem", color: "var(--setup-muted)", whiteSpace: "nowrap" }}>{t("rsvp.headcountLabel")}</label>
                      <input type="number" min="0" max={totalGuests} className="setup-input"
                        style={{ width: "4rem", fontSize: "0.85rem", padding: "0.25rem 0.4rem" }}
                        value={(rsvpForm.menuHeadcounts && rsvpForm.menuHeadcounts[opt.key]) || 0}
                        onChange={handleHeadcountChange}
                        data-headcount-key={opt.key}
                        required={headcountSum === 0}
                        disabled={isAlreadySubmitted} />
                    </div>
                  </div>
                </div>
              ))}
              {headcountExceed ? (
                <p role="alert" style={{ fontSize: "0.78rem", color: "#ef4444", marginTop: "0.15rem" }}>
                  {t("rsvp.headcountExceed")}
                </p>
              ) : null}
              {menuPostre?.trim() ? (
                <div style={{ marginTop: "0.3rem", padding: "0.5rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                  <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.15rem" }}>{t("rsvp.postre")}</p>
                  <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{menuPostre}</p>
                </div>
              ) : null}
              <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", marginTop: "0.5rem" }}>
                {DIETARY_OPTIONS.map((opt: any) => (
                  <label key={opt.value} className="setup-checkbox-label" style={{
                    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: isAlreadySubmitted ? "default" : "pointer", fontSize: "0.9rem",
                    color: "var(--setup-title)",
                  }}>
                    <input type="checkbox" checked={rsvpForm.dietarySelection.includes(opt.value)} onChange={handleDietaryChange} value={opt.value} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} disabled={isAlreadySubmitted} />
                    {opt.label}
                  </label>
                ))}
              </div>
              <input className="setup-input" style={{ marginTop: "0.4rem" }} value={rsvpForm.dietaryOther} onChange={handleDietaryOtherChange} placeholder={t("rsvp.allergiesPlaceholder")} autoComplete="off" disabled={isAlreadySubmitted} />
            </fieldset>
          ) : rsvpForm.attendance === "yes" && menuTexto?.trim() ? (
            <div style={{ marginBottom: "0.5rem", marginTop: "0.5rem", padding: "0.6rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
              <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>{t("rsvp.menuLabel")}</p>
              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{menuTexto}</p>
            </div>
          ) : null}

          {rsvpForm.attendance === "yes" && !menuEnabled ? (
            <fieldset style={{ border: "none", padding: 0, margin: 0, minInlineSize: 0 }}>
              <legend className="setup-label" style={{ marginBottom: "0.4rem" }}>{t("rsvp.allergiesLegend")}</legend>
              <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                {DIETARY_OPTIONS.map((opt: any) => (
                  <label key={opt.value} className="setup-checkbox-label" style={{
                    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: isAlreadySubmitted ? "default" : "pointer", fontSize: "0.9rem",
                    color: "var(--setup-title)",
                  }}>
                    <input type="checkbox" checked={rsvpForm.dietarySelection.includes(opt.value)} onChange={handleDietaryChange} value={opt.value} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} disabled={isAlreadySubmitted} />
                    {opt.label}
                  </label>
                ))}
              </div>
              <input className="setup-input" style={{ marginTop: "0.4rem" }} value={rsvpForm.dietaryOther} onChange={handleDietaryOtherChange} placeholder={t("rsvp.allergiesPlaceholder")} autoComplete="off" disabled={isAlreadySubmitted} />
            </fieldset>
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
