import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";

const RsvpSection = memo(function RsvpSection({
  style, className,
  rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,
  updateRsvpField, handleRsvpSubmit, handleDeleteRsvp, handleDietaryToggle, DIETARY_OPTIONS, menuEnabled, menuCarne, menuPescado, menuVegano, menuPostre, menuTexto, computeAge,
}) {
  const { t } = useTranslation();
  const { setLegalModal } = useApp();

  const isAlreadySubmitted = !!alreadySubmittedEntry;
  const isDisabled = isRsvpSubmitting || hasSubmitted || isAlreadySubmitted;

  const age = useMemo(() => computeAge(rsvpForm.birthDate), [rsvpForm.birthDate, computeAge]);
  const isUnder14 = age !== null && age < 14;
  const hasDietaryData = rsvpForm.dietarySelection.length > 0 || rsvpForm.dietaryOther.trim() !== "";
  const showHealthConsent = rsvpForm.attendance === "yes" && hasDietaryData;

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

        <form className="rsvp-form" onSubmit={handleRsvpSubmit}>
          <label className="setup-label" htmlFor="rsvpName">{t("rsvp.nameLabel")}</label>
          <input id="rsvpName" className="setup-input" value={rsvpForm.guestName} onChange={(e) => updateRsvpField("guestName", e.target.value.slice(0, 120))} placeholder={t("rsvp.namePlaceholder")} autoComplete="off" required disabled={isAlreadySubmitted} />

          <div className="setup-date-grid rsvp-choice-grid">
            <div>
              <label className="setup-label" htmlFor="rsvpAttendance">{t("rsvp.attendanceLabel")}</label>
              <select id="rsvpAttendance" className="setup-input" value={rsvpForm.attendance} onChange={(e) => updateRsvpField("attendance", e.target.value)} disabled={isAlreadySubmitted}>
                <option value="yes">{t("rsvp.attending")}</option>
                <option value="no">{t("rsvp.notAttending")}</option>
              </select>
            </div>
          </div>

          {rsvpForm.attendance === "yes" && menuEnabled ? (
            <fieldset style={{ border: "none", padding: 0, margin: 0, minInlineSize: 0 }}>
              <legend className="setup-label" style={{ marginBottom: "0.4rem" }}>{t("rsvp.menuLegend")}</legend>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.4rem" }}>
                  {[
                    { value: "carne", label: t("rsvp.menuCarne") },
                    { value: "pescado", label: t("rsvp.menuPescado") },
                    { value: "vegano", label: t("rsvp.menuVegano") },
                  ].map(opt => (
                    <label key={opt.value} className="setup-checkbox-label" style={{
                      display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.6rem", cursor: isAlreadySubmitted ? "default" : "pointer",
                      fontSize: "0.9rem", borderRadius: "0.6rem",
                      background: rsvpForm.mealChoice === opt.value ? "color-mix(in srgb, var(--setup-accent) 18%, transparent)" : "color-mix(in srgb, var(--setup-field-bg) 70%, transparent)",
                      border: rsvpForm.mealChoice === opt.value ? "1px solid color-mix(in srgb, var(--setup-accent) 40%, transparent)" : "1px solid transparent",
                      color: "var(--setup-title)", transition: "background 200ms, border-color 200ms",
                    }}>
                      <input type="checkbox" checked={rsvpForm.mealChoice === opt.value} onChange={() => updateRsvpField("mealChoice", rsvpForm.mealChoice === opt.value ? "" : opt.value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} disabled={isAlreadySubmitted} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {rsvpForm.mealChoice && (() => {
                  const desc = { carne: menuCarne, pescado: menuPescado, vegano: menuVegano }[rsvpForm.mealChoice];
                  const lbl = { carne: t("rsvp.menuCarne"), pescado: t("rsvp.menuPescado"), vegano: t("rsvp.menuVegano") }[rsvpForm.mealChoice];
                  return desc ? (
                    <div style={{ marginTop: "0.4rem", padding: "0.6rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 20%, transparent)" }}>
                      <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.15rem" }}>{lbl}</p>
                      <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{desc}</p>
                    </div>
                  ) : null;
                })()}
                {menuPostre?.trim() ? (
                  <div style={{ marginTop: "0.3rem", padding: "0.5rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                    <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.15rem" }}>{t("rsvp.postre")}</p>
                    <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{menuPostre}</p>
                  </div>
                ) : null}
                <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", marginTop: "0.5rem" }}>
                  {DIETARY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="setup-checkbox-label" style={{
                      display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: isAlreadySubmitted ? "default" : "pointer", fontSize: "0.9rem",
                      color: "var(--setup-title)",
                    }}>
                      <input type="checkbox" checked={rsvpForm.dietarySelection.includes(opt.value)} onChange={() => handleDietaryToggle(opt.value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} disabled={isAlreadySubmitted} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <input className="setup-input" style={{ marginTop: "0.4rem" }} value={rsvpForm.dietaryOther} onChange={(e) => updateRsvpField("dietaryOther", e.target.value.slice(0, 120))} placeholder={t("rsvp.allergiesPlaceholder")} autoComplete="off" disabled={isAlreadySubmitted} />
              </div>
            </fieldset>
          ) : rsvpForm.attendance === "yes" && menuTexto?.trim() ? (
            <div style={{ marginBottom: "0.5rem", padding: "0.6rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
              <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>{t("rsvp.menuLabel")}</p>
              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{menuTexto}</p>
            </div>
          ) : null}
          {rsvpForm.attendance === "yes" && !menuEnabled ? (
            <fieldset style={{ border: "none", padding: 0, margin: 0, minInlineSize: 0 }}>
              <legend className="setup-label" style={{ marginBottom: "0.4rem" }}>{t("rsvp.allergiesLegend")}</legend>
              <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                {DIETARY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="setup-checkbox-label" style={{
                    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: isAlreadySubmitted ? "default" : "pointer", fontSize: "0.9rem",
                    color: "var(--setup-title)",
                  }}>
                    <input type="checkbox" checked={rsvpForm.dietarySelection.includes(opt.value)} onChange={() => handleDietaryToggle(opt.value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} disabled={isAlreadySubmitted} />
                    {opt.label}
                  </label>
                ))}
              </div>
              <input className="setup-input" style={{ marginTop: "0.4rem" }} value={rsvpForm.dietaryOther} onChange={(e) => updateRsvpField("dietaryOther", e.target.value.slice(0, 120))} placeholder={t("rsvp.allergiesPlaceholder")} autoComplete="off" disabled={isAlreadySubmitted} />
            </fieldset>
          ) : null}

          {rsvpForm.attendance === "yes" && menuEnabled ? (
            <p className="setup-help" style={{ fontSize: "0.8rem" }}>{t("rsvp.allergiesHint")}</p>
          ) : null}

          <label className="setup-label" htmlFor="rsvpBirthDate" style={{ marginTop: "0.5rem" }}>{t("rsvp.birthDateLabel")}</label>
          <input id="rsvpBirthDate"               type="date"
              max={new Date().toISOString().split("T")[0]} className="setup-input" value={rsvpForm.birthDate} onChange={(e) => updateRsvpField("birthDate", e.target.value)} style={{ colorScheme: "light" }} disabled={isAlreadySubmitted} />

          {isUnder14 ? (
            <p style={{ fontSize: "0.82rem", color: "#e88b2c", margin: "0.3rem 0" }}>{t("rsvp.ageUnder14Warning")}</p>
          ) : null}

          {isUnder14 ? (
            <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: isAlreadySubmitted ? "default" : "pointer", marginBottom: "0.5rem" }}>
              <input type="checkbox" checked={rsvpForm.parentalConsent} onChange={(e) => updateRsvpField("parentalConsent", e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} disabled={isAlreadySubmitted} />
              <span>{t("rsvp.parentalConsent")}</span>
            </label>
          ) : null}

          <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: isAlreadySubmitted ? "default" : "pointer" }}>
            <input type="checkbox" checked={rsvpForm.privacyConsent} onChange={(e) => updateRsvpField("privacyConsent", e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} required disabled={isAlreadySubmitted} />
            <span>{t("rsvp.privacyConsent", { link: <button type="button" onClick={() => setLegalModal("privacy")} style={{ color: "var(--setup-accent)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>{t("rsvp.privacyLink")}</button> })}</span>
          </label>

          {showHealthConsent ? (
            <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: isAlreadySubmitted ? "default" : "pointer" }}>
              <input type="checkbox" checked={rsvpForm.healthConsent} onChange={(e) => updateRsvpField("healthConsent", e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} disabled={isAlreadySubmitted} />
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
