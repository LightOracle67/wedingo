import { memo, useCallback } from "react";
import StatsCard from "./StatsCard";

const PanelTab = memo(function PanelTab({
  confirmedResponses, declinedResponses, totalGuests, rsvpEntries,
  setActiveTab, setAttendanceFilter, exportCsv, formatDate,
}) {
  const pendingResponses = Math.max(0, rsvpEntries.length - confirmedResponses - declinedResponses);

  const copyLink = useCallback(async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
  }, []);

  return (
    <>
      <div className="admin-stats-grid">
        <StatsCard label="Confirmados" value={confirmedResponses} />
        <StatsCard label="No asistirán" value={declinedResponses} />
        <StatsCard label="Sin responder" value={pendingResponses} />
        <StatsCard label="Total invitados" value={totalGuests} />
      </div>

      <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>
          Tu invitación está publicada en:
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--setup-accent)", fontSize: "0.9rem", wordBreak: "break-all" }}
          >
            {window.location.origin}
          </a>
          <button
            className="setup-button setup-button--ghost setup-button--compact"
            type="button"
            onClick={copyLink}
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", flexShrink: 0 }}
          >
            Copiar
          </button>
        </div>
      </div>

      <div className="admin-panel-actions">
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => { setActiveTab("asistencia"); setAttendanceFilter("all"); }}>
          Ver lista completa
        </button>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportCsv}>
          Exportar CSV
        </button>
        <a className="setup-button setup-button--ghost setup-button--compact" href={window.location.origin} target="_blank" rel="noreferrer">
          Ver portada
        </a>
      </div>

      {rsvpEntries.length > 0 ? (
        <div className="admin-recent-section">
          <p className="setup-label setup-label--tight">Últimas respuestas</p>
          {rsvpEntries.slice(0, 5).map((entry) => (
            <div key={entry.id} className="admin-recent-row">
              <span className="admin-recent-row__name">{entry.guestName}</span>
              <span className={`admin-recent-row__status admin-recent-row__status--${entry.attendance}`}>
                {entry.attendance === "yes" ? `Sí (${entry.companions} acompañante${entry.companions === 1 ? "" : "s"})` : "No asistirá"}
              </span>
              <span className="admin-recent-row__date">{formatDate(entry.submittedAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="setup-help">Todavía no hay respuestas de asistencia.</p>
      )}
    </>
  );
});

export default PanelTab;
