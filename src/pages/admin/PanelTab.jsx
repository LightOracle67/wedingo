import { memo, useCallback, useRef, useState } from "react";
import { setDoc, doc } from "firebase/firestore";
import { db, invitationDocRef } from "../../lib/firebase";
import StatsCard from "./StatsCard";

const PanelTab = memo(function PanelTab({
  inviteToken, confirmedResponses, declinedResponses, totalGuests, rsvpEntries,
  setActiveTab, setAttendanceFilter, exportCsv, formatDate, onRestore,
}) {
  const pendingResponses = Math.max(0, rsvpEntries.length - confirmedResponses - declinedResponses);
  const inviteUrl = `${window.location.origin}/${inviteToken}`;
  const restoreRef = useRef(null);
  const [restoreMsg, setRestoreMsg] = useState("");

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {}
  }, [inviteUrl]);

  const handleBackup = useCallback(async () => {
    const { getDocs } = await import("firebase/firestore");
    const { INVITATIONS_COLLECTION_REF } = await import("../../lib/firebase");
    try {
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }, []);

  const handleRestore = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreMsg("");
    let count = 0;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) { setRestoreMsg("El archivo no tiene el formato esperado."); return; }
      for (const item of data) {
        if (!item.id) continue;
        const { id, ...rest } = item;
        await setDoc(invitationDocRef(id), rest);
        count++;
      }
      if (onRestore) await onRestore();
      setRestoreMsg(`Restauradas ${count} invitaciones correctamente.`);
    } catch {
      setRestoreMsg("No se pudo restaurar la copia. Revisa el archivo.");
    }
    e.target.value = "";
  }, [onRestore]);

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
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--setup-accent)", fontSize: "0.9rem", wordBreak: "break-all" }}
          >
            {inviteUrl}
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
        <a className="setup-button setup-button--ghost setup-button--compact" href={inviteUrl} target="_blank" rel="noreferrer">
          Ver portada
        </a>
      </div>

      <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid var(--setup-border)" }} />

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleBackup}>
          Descargar copia
        </button>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => restoreRef.current?.click()}>
          Restaurar copia
        </button>
        <input ref={restoreRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleRestore} />
      </div>
      {restoreMsg ? <p className="setup-help" style={{ marginTop: "0.5rem" }}>{restoreMsg}</p> : null}

      {rsvpEntries.length > 0 ? (
        <div className="admin-recent-section" style={{ marginTop: "1rem" }}>
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
