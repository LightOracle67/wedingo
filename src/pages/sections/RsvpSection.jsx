import { memo, useMemo } from "react";

const RsvpSection = memo(function RsvpSection({
  style, className,
  rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted,
  updateRsvpField, handleRsvpSubmit, handleDietaryToggle, DIETARY_OPTIONS,
}) {
  const alreadySubmitted = useMemo(() => {
    const name = rsvpForm.guestName.trim().toLowerCase();
    if (!name) return false;
    return rsvpEntries.some((e) => e.guestName.trim().toLowerCase() === name);
  }, [rsvpForm.guestName, rsvpEntries]);

  const isDisabled = isRsvpSubmitting || hasSubmitted || alreadySubmitted;
  return (
    <section
      data-story-section="rsvp"
      className={`${className} flex min-h-dvh items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10`}
      style={style}
    >
      <div className="story-card story-panel story-card--rsvp allow-select w-full max-w-[min(100%,42rem)]">
        <p className="story-eyebrow text-center">Confirmación de asistencia</p>
        <h2 className="story-title text-center">Confirma tu asistencia</h2>
        <p className="story-copy text-center">
          Tu respuesta nos ayuda a organizar cada detalle de la celebración.
        </p>

        <form className="rsvp-form" onSubmit={handleRsvpSubmit}>
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

          <div className="setup-date-grid rsvp-choice-grid">
            <div>
              <label className="setup-label" htmlFor="rsvpAttendance">¿Asistirás?</label>
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
            <div style={{ opacity: rsvpForm.attendance === "no" ? 0.4 : 1 }}>
              <label className="setup-label" htmlFor="rsvpCompanions">Acompañantes</label>
              <input
                id="rsvpCompanions"
                className="setup-input"
                type="number"
                min="0"
                max="10"
                value={rsvpForm.attendance === "no" ? "" : rsvpForm.companions}
                onChange={(e) => updateRsvpField("companions", e.target.value)}
                disabled={rsvpForm.attendance === "no"}
                placeholder="Número de acompañantes"
                tabIndex={rsvpForm.attendance === "no" ? -1 : 0}
              />
            </div>
          </div>

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

          <label className="setup-label" htmlFor="rsvpNote">Mensaje opcional</label>
          <textarea
            id="rsvpNote"
            className="setup-textarea"
            rows={2}
            value={rsvpForm.note}
            onChange={(e) => updateRsvpField("note", e.target.value.slice(0, 240))}
            placeholder="Cuéntanos cualquier otro detalle importante"
          />

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
