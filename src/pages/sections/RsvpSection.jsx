import { memo, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";

const RsvpSection = memo(function RsvpSection({
  style, className,
  rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted,
  updateRsvpField, handleRsvpSubmit, handleDietaryToggle, DIETARY_OPTIONS, menuEnabled, menuCarne, menuPescado, menuVegano, menuPostre,
}) {
  const { setLegalModal } = useApp();
  const [useGroupMode, setUseGroupMode] = useState(false);

  const alreadySubmitted = useMemo(() => {
    const name = rsvpForm.guestName.trim().toLowerCase();
    if (!name) return false;
    return rsvpEntries.some((e) => e.guestName.trim().toLowerCase() === name);
  }, [rsvpForm.guestName, rsvpEntries]);

  const isDisabled = isRsvpSubmitting || hasSubmitted || alreadySubmitted;

  return (
    <section
      data-story-section="rsvp"
      className={`${className} flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10`}
      style={style}
    >
      <div className="story-card story-panel story-card--rsvp allow-select w-full max-w-[min(100%,42rem)]">
        <p className="story-eyebrow text-center">Confirmación de asistencia</p>
        <h2 className="story-title text-center">Confirma tu asistencia</h2>
        <p className="story-copy text-center">
          Tu respuesta nos ayuda a organizar cada detalle de la celebración.
        </p>

        <form className="rsvp-form" onSubmit={handleRsvpSubmit}>
          <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", color: "var(--setup-title)" }}>
            <input type="checkbox" checked={useGroupMode} onChange={(e) => setUseGroupMode(e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem" }} />
            Confirmar para varios invitados
          </label>

          {useGroupMode ? (
            <>
              <label className="setup-label" htmlFor="rsvpGroupList">Lista de invitados (un nombre por línea)</label>
              <textarea
                id="rsvpGroupList"
                className="setup-textarea"
                rows={4}
                value={rsvpForm.guestList}
                onChange={(e) => updateRsvpField("guestList", e.target.value.slice(0, 500))}
                placeholder="María García López&#10;Juan Pérez Sánchez&#10;Ana Martínez Ruiz"
                autoComplete="off"
              />
            </>
          ) : (
            <>
              <label className="setup-label" htmlFor="rsvpName">Tu nombre</label>
              <input
                id="rsvpName"
                className="setup-input"
                value={rsvpForm.guestName}
                onChange={(e) => updateRsvpField("guestName", e.target.value.slice(0, 120))}
                placeholder="Escribe tu nombre y apellidos"
                autoComplete="off"
                required
              />
            </>
          )}

          <div className="setup-date-grid rsvp-choice-grid">
            <div>
              <label className="setup-label" htmlFor="rsvpAttendance">¿Asistiréis?</label>
              <select
                id="rsvpAttendance"
                className="setup-input"
                value={rsvpForm.attendance}
                onChange={(e) => updateRsvpField("attendance", e.target.value)}
              >
                <option value="yes">Sí, asistiré</option>
                <option value="no">No podré asistir</option>
              </select>
            </div>
            {!useGroupMode ? (
              <div style={{ opacity: rsvpForm.attendance === "no" ? 0.4 : 1 }}>
                <label className="setup-label" htmlFor="rsvpCompanions">Acompañantes (incluyéndote)</label>
                <input
                  id="rsvpCompanions"
                  className="setup-input"
                  type="number"
                  min="0"
                  max="10"
                  value={rsvpForm.attendance === "no" ? "" : rsvpForm.companions}
                  onChange={(e) => updateRsvpField("companions", e.target.value)}
                  disabled={rsvpForm.attendance === "no"}
                  placeholder="0 = solo tú, 1 = tú + 1, etc."
                  tabIndex={rsvpForm.attendance === "no" ? -1 : 0}
                />
              </div>
            ) : (
              <div style={{ opacity: rsvpForm.attendance === "no" ? 0.4 : 1 }}>
                <label className="setup-label" style={{ color: "var(--setup-muted)", fontSize: "0.85rem" }}>Invitados</label>
                <p className="setup-help" style={{ marginTop: "0.3rem" }}>Cada línea cuenta como un invitado</p>
              </div>
            )}
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
                    { value: "otro", label: "Otro" },
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
                {rsvpForm.mealChoice === "otro" && (
                  <input className="setup-input" value={rsvpForm.mealOther} onChange={(e) => updateRsvpField("mealOther", e.target.value.slice(0, 120))} placeholder="Especifica tu preferencia" autoComplete="off" style={{ marginTop: "0.3rem" }} disabled={rsvpForm.attendance === "no"} />
                )}
                {rsvpForm.mealChoice && rsvpForm.mealChoice !== "otro" && (() => {
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
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem", color: rsvpForm.attendance === "no" ? "var(--setup-muted)" : "var(--setup-title)" }}>
                    <input type="checkbox" checked={rsvpForm.noGluten} onChange={(e) => updateRsvpField("noGluten", e.target.checked)} disabled={rsvpForm.attendance === "no"} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                    Sin gluten
                  </label>
                  <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem", color: rsvpForm.attendance === "no" ? "var(--setup-muted)" : "var(--setup-title)" }}>
                    <input type="checkbox" checked={rsvpForm.noLactosa} onChange={(e) => updateRsvpField("noLactosa", e.target.checked)} disabled={rsvpForm.attendance === "no"} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                    Sin lactosa
                  </label>
                </div>
              </div>
            </fieldset>
          ) : menuCarne?.trim() ? (
            <div style={{ marginBottom: "0.5rem", padding: "0.6rem", borderRadius: "0.6rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
              <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>Menú</p>
              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{menuCarne}</p>
            </div>
          ) : null}
          {!menuEnabled ? (
            <fieldset style={{ border: "none", padding: 0, margin: 0, minInlineSize: 0 }}>
              <legend className="setup-label" style={{ marginBottom: "0.4rem" }}>Preferencias alimentarias</legend>
              <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                {DIETARY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="setup-checkbox-label" style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem",
                    color: rsvpForm.attendance === "no" ? "var(--setup-muted)" : "var(--setup-title)",
                    opacity: rsvpForm.attendance === "no" ? 0.5 : 1,
                  }}>
                    <input
                      type="checkbox"
                      checked={rsvpForm.dietarySelection.includes(opt.value)}
                      onChange={() => handleDietaryToggle(opt.value)}
                      disabled={rsvpForm.attendance === "no"}
                      style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <input
                className="setup-input"
                style={{ marginTop: "0.4rem" }}
                value={rsvpForm.dietaryOther}
                onChange={(e) => updateRsvpField("dietaryOther", e.target.value.slice(0, 120))}
                placeholder="Otra (especificar)"
                disabled={rsvpForm.attendance === "no"}
                autoComplete="off"
              />
            </fieldset>
          ) : null}

          <div style={{ opacity: rsvpForm.attendance === "no" ? 0.4 : 1 }}>
            <label className="setup-label" htmlFor="rsvpNote">Mensaje opcional</label>
            <textarea
              id="rsvpNote"
              className="setup-textarea"
              rows={2}
              value={rsvpForm.note}
              onChange={(e) => updateRsvpField("note", e.target.value.slice(0, 240))}
              placeholder="Cuéntanos cualquier otro detalle importante"
              disabled={rsvpForm.attendance === "no"}
              tabIndex={rsvpForm.attendance === "no" ? -1 : 0}
            />
          </div>

          <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={rsvpForm.privacyConsent} onChange={(e) => updateRsvpField("privacyConsent", e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} required />
            <span>Acepto la <button type="button" onClick={() => setLegalModal("privacy")} style={{ color: "var(--setup-accent)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>Política de Privacidad</button></span>
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
