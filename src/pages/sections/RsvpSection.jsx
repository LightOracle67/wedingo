import { memo, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";

const RsvpSection = memo(function RsvpSection({
  style, className,
  rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted,
  updateRsvpField, handleRsvpSubmit, handleDietaryToggle, DIETARY_OPTIONS, menuEnabled, menuCarne, menuPescado, menuVegano, menuPostre, menuTexto,
}) {
  const { setLegalModal } = useApp();

  const alreadySubmitted = useMemo(() => {
    const name = rsvpForm.guestName.trim().toLowerCase();
    if (!name) return false;
    return rsvpEntries.some((e) => e.guestName.trim().toLowerCase() === name);
  }, [rsvpForm.guestName, rsvpEntries]);

  const isDisabled = isRsvpSubmitting || hasSubmitted || alreadySubmitted;

  return (
    <section data-story-section="rsvp" className={`${className} flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10`} style={style}>
      <div className="story-card story-panel story-card--rsvp allow-select w-full max-w-[min(100%,42rem)]">
        <p className="story-eyebrow text-center">Confirmación de asistencia</p>
        <h2 className="story-title text-center">Confirma tu asistencia</h2>
        <p className="story-copy text-center">Tu respuesta nos ayuda a organizar cada detalle de la celebración.</p>

        <form className="rsvp-form" onSubmit={handleRsvpSubmit}>
          <label className="setup-label" htmlFor="rsvpName">Tu nombre</label>
          <input id="rsvpName" className="setup-input" value={rsvpForm.guestName} onChange={(e) => updateRsvpField("guestName", e.target.value.slice(0, 120))} placeholder="Escribe tu nombre y apellidos" autoComplete="off" required />

          <div className="setup-date-grid rsvp-choice-grid">
            <div>
              <label className="setup-label" htmlFor="rsvpAttendance">¿Asistirás?</label>
              <select id="rsvpAttendance" className="setup-input" value={rsvpForm.attendance} onChange={(e) => updateRsvpField("attendance", e.target.value)}>
                <option value="yes">Sí, asistiré</option>
                <option value="no">No podré asistir</option>
              </select>
            </div>
          </div>

          {menuEnabled ? (
            <fieldset style={{ border: "none", padding: 0, margin: 0, minInlineSize: 0 }}>
              <legend className="setup-label" style={{ marginBottom: "0.4rem" }}>Elección de menú *</legend>
              <div style={{ opacity: rsvpForm.attendance === "no" ? 0.4 : 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.4rem" }}>
                  {[
                    { value: "carne", label: "Carne" },
                    { value: "pescado", label: "Pescado" },
                    { value: "vegano", label: "Vegano/Vegetariano" },
                  ].map(opt => (
                    <label key={opt.value} className="setup-checkbox-label" style={{
                      display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.6rem", cursor: "pointer",
                      fontSize: "0.9rem", borderRadius: "0.6rem",
                      background: rsvpForm.mealChoice === opt.value ? "color-mix(in srgb, var(--setup-accent) 18%, transparent)" : "color-mix(in srgb, var(--setup-field-bg) 70%, transparent)",
                      border: rsvpForm.mealChoice === opt.value ? "1px solid color-mix(in srgb, var(--setup-accent) 40%, transparent)" : "1px solid transparent",
                      color: rsvpForm.attendance === "no" ? "var(--setup-muted)" : "var(--setup-title)",
                      transition: "background 200ms, border-color 200ms",
                    }}>
                      <input type="checkbox" checked={rsvpForm.mealChoice === opt.value} onChange={() => updateRsvpField("mealChoice", rsvpForm.mealChoice === opt.value ? "" : opt.value)} disabled={rsvpForm.attendance === "no"} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {rsvpForm.mealChoice && (() => {
                  const desc = { carne: menuCarne, pescado: menuPescado, vegano: menuVegano }[rsvpForm.mealChoice];
                  const lbl = { carne: "Carne", pescado: "Pescado", vegano: "Vegano/Vegetariano" }[rsvpForm.mealChoice];
                  return desc ? (
                    <div style={{ marginTop: "0.4rem", padding: "0.6rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 20%, transparent)" }}>
                      <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.15rem" }}>{lbl}</p>
                      <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{desc}</p>
                    </div>
                  ) : null;
                })()}
                {menuPostre?.trim() ? (
                  <div style={{ marginTop: "0.3rem", padding: "0.5rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                    <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.15rem" }}>Postre</p>
                    <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{menuPostre}</p>
                  </div>
                ) : null}
                <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", marginTop: "0.5rem" }}>
                  {DIETARY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="setup-checkbox-label" style={{
                      display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem",
                      color: rsvpForm.attendance === "no" ? "var(--setup-muted)" : "var(--setup-title)", opacity: rsvpForm.attendance === "no" ? 0.5 : 1,
                    }}>
                      <input type="checkbox" checked={rsvpForm.dietarySelection.includes(opt.value)} onChange={() => handleDietaryToggle(opt.value)} disabled={rsvpForm.attendance === "no"} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <input className="setup-input" style={{ marginTop: "0.4rem" }} value={rsvpForm.dietaryOther} onChange={(e) => updateRsvpField("dietaryOther", e.target.value.slice(0, 120))} placeholder="Otra alergia (especificar)" disabled={rsvpForm.attendance === "no"} autoComplete="off" />
              </div>
            </fieldset>
          ) : menuTexto?.trim() ? (
            <div style={{ marginBottom: "0.5rem", padding: "0.6rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
              <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>Menú</p>
              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{menuTexto}</p>
            </div>
          ) : null}
          {!menuEnabled ? (
            <fieldset style={{ border: "none", padding: 0, margin: 0, minInlineSize: 0 }}>
              <legend className="setup-label" style={{ marginBottom: "0.4rem" }}>Alergias e intolerancias</legend>
              <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                {DIETARY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="setup-checkbox-label" style={{
                    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem",
                    color: rsvpForm.attendance === "no" ? "var(--setup-muted)" : "var(--setup-title)", opacity: rsvpForm.attendance === "no" ? 0.5 : 1,
                  }}>
                    <input type="checkbox" checked={rsvpForm.dietarySelection.includes(opt.value)} onChange={() => handleDietaryToggle(opt.value)} disabled={rsvpForm.attendance === "no"} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                    {opt.label}
                  </label>
                ))}
              </div>
              <input className="setup-input" style={{ marginTop: "0.4rem" }} value={rsvpForm.dietaryOther} onChange={(e) => updateRsvpField("dietaryOther", e.target.value.slice(0, 120))} placeholder="Otra alergia (especificar)" disabled={rsvpForm.attendance === "no"} autoComplete="off" />
            </fieldset>
          ) : null}

          {!menuEnabled ? null : (
            <p className="setup-help" style={{ fontSize: "0.8rem" }}>Indica si tienes alergias o intolerancias marcando las casillas superiores.</p>
          )}

          <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={rsvpForm.privacyConsent} onChange={(e) => updateRsvpField("privacyConsent", e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} required />
            <span>Acepto la <button type="button" onClick={() => setLegalModal("privacy")} style={{ color: "var(--setup-accent)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>Política de Privacidad</button></span>
          </label>

          <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={rsvpForm.healthConsent} onChange={(e) => updateRsvpField("healthConsent", e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
            <span>Consiento el tratamiento de mis datos de salud para la organización del evento</span>
          </label>

          <div className="setup-actions">
            <button className="setup-button" type="submit" disabled={isDisabled}>
              {isRsvpSubmitting ? "Enviando..." : isDisabled ? "Asistencia confirmada" : "Confirmar asistencia"}
            </button>
          </div>
        </form>

        {rsvpMessage ? <p className="rsvp-feedback" aria-live="polite">{rsvpMessage}</p> : null}
      </div>
    </section>
  );
});

export default RsvpSection;
