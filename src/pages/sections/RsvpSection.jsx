import { memo } from "react";

const RsvpSection = memo(function RsvpSection({
  style, className,
  rsvpForm, rsvpMessage, isRsvpSubmitting,
  updateRsvpField, handleRsvpSubmit,
}) {
  return (
    <section
      data-story-section="rsvp"
      className={`${className} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
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

          <label className="setup-label" htmlFor="rsvpDietary">Preferencias alimentarias</label>
          <textarea
            id="rsvpDietary"
            className="setup-textarea"
            value={rsvpForm.dietaryInfo}
            onChange={(e) => updateRsvpField("dietaryInfo", e.target.value.slice(0, 240))}
            placeholder="Alergias, intolerancias, dieta vegana/vegetariana..."
          />

          <label className="setup-label" htmlFor="rsvpNote">Mensaje opcional</label>
          <textarea
            id="rsvpNote"
            className="setup-textarea"
            value={rsvpForm.note}
            onChange={(e) => updateRsvpField("note", e.target.value.slice(0, 240))}
            placeholder="Cuéntanos cualquier otro detalle importante"
          />

          <div className="setup-actions">
            <button className="setup-button" type="submit" disabled={isRsvpSubmitting}>
              {isRsvpSubmitting ? "Enviando..." : "Confirmar asistencia"}
            </button>
          </div>
        </form>

        {rsvpMessage ? <p className="rsvp-feedback" aria-live="polite">{rsvpMessage}</p> : null}
      </div>
    </section>
  );
});

export default RsvpSection;
