import { memo, useCallback, useMemo, useRef, useState } from "react";
import { setDoc } from "firebase/firestore";
import { invitationDocRef } from "../../lib/firebase";
import { calcRSVPSummary, getDietarySummary } from "../../lib/admin-utils";
import { DonutChart, Legend } from "../../lib/chart-utils";
import StatsCard from "./StatsCard";

const PanelTab = memo(function PanelTab({
  inviteToken, confirmedResponses, declinedResponses, totalGuests, rsvpEntries,
  setActiveTab, setAttendanceFilter, exportPdf, formatDate, onRestore, visitCount,
}) {
  const inviteUrl = `${window.location.origin}/${inviteToken}`;
  const restoreRef = useRef(null);
  const [restoreMsg, setRestoreMsg] = useState("");

  const summary = useMemo(() => calcRSVPSummary(rsvpEntries), [rsvpEntries]);
  const dietary = useMemo(() => getDietarySummary(rsvpEntries).slice(0, 5), [rsvpEntries]);

  const copyLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(inviteUrl); } catch {}
  }, [inviteUrl]);

  const handleEditInvitation = useCallback(() => {
    setActiveTab("invitacion");
  }, [setActiveTab]);

  const handleViewAttendance = useCallback(() => {
    setActiveTab("asistencia");
    setAttendanceFilter("all");
  }, [setActiveTab, setAttendanceFilter]);

  const handleBackup = useCallback(async () => {
    const { getDoc } = await import("firebase/firestore");
    try {
      const snap = await getDoc(invitationDocRef(inviteToken));
      if (!snap.exists()) { setRestoreMsg("No se encontró la invitación."); return; }
      const data = [{ id: snap.id, ...snap.data() }];
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-${inviteToken}-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }, [inviteToken]);

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
        <StatsCard label="Sin responder" value={summary.pending} />
        <StatsCard label="Total invitados" value={totalGuests} />
      </div>

      <div className="setup-help" style={{ marginBottom: "0.5rem", fontSize: "0.8rem", textAlign: "center" }}>
        {visitCount > 0 ? `👁 ${visitCount} visita${visitCount === 1 ? "" : "s"}` : "Sin visitas registradas"}
      </div>

      {summary.confirmed + summary.declined > 0 && (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "1rem", textAlign: "center" }}>
          <DonutChart yes={summary.confirmed} no={summary.declined} pending={summary.pending} size={120} />
          <Legend items={[
            { label: "Confirman", value: summary.confirmed, color: "var(--accent, #22c55e)" },
            { label: "Declinan", value: summary.declined, color: "#ef4444" },
            { label: "Pendientes", value: summary.pending, color: "#f59e0b" },
          ]} />
        </div>
      )}

      {dietary.length > 0 && (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.3rem", fontSize: "0.8rem" }}>
            Preferencias alimentarias
          </p>
          {dietary.map((d) => (
            <div key={d.item} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.15rem 0", borderBottom: "1px solid var(--setup-border)" }}>
              <span style={{ textTransform: "capitalize" }}>{d.item}</span>
              <span style={{ fontWeight: 600 }}>{d.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>
          Tu invitación está publicada en:
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
          <a href={inviteUrl} target="_blank" rel="noreferrer"
            style={{ color: "var(--setup-accent)", fontSize: "0.9rem", wordBreak: "break-all" }}>
            {inviteUrl}
          </a>
          <button className="setup-button setup-button--ghost setup-button--compact" type="button"
            onClick={copyLink} style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", flexShrink: 0 }}>
            Copiar
          </button>
        </div>
      </div>

      <div className="admin-panel-actions" style={{ marginBottom: "0.75rem" }}>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleEditInvitation}>
          Editar invitación
        </button>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleViewAttendance}>
          Ver asistencia
        </button>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportPdf}>
          Exportar PDF
        </button>
        <a className="setup-button setup-button--ghost setup-button--compact" href={inviteUrl} target="_blank" rel="noreferrer">
          Vista previa
        </a>
        <a className="setup-button setup-button--ghost setup-button--compact" href={`${inviteUrl}?invitar`} target="_blank" rel="noreferrer">
          Como invitado
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
