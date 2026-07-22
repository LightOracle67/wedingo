import { memo, useCallback, useMemo, useRef } from "react";
import { getDoc, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";
import { invitationDocRef } from "../../lib/firebase";
import { calcRSVPSummary, getDietarySummary } from "../../lib/admin-utils";
import { DonutChart, Legend } from "../../components/AttendanceChart";
import StatsCard from "./StatsCard";

const PanelTab = memo(function PanelTab(props: any) {
  const config = props.config;
  const {
  inviteToken, confirmedResponses, declinedResponses, totalGuests, rsvpEntries,
} = config;
  const { formatDate, onRestore, visitCount } = props;
  const { t } = useTranslation();
  const { addToast } = useToast();
  const inviteUrl = `${window.location.origin}/${inviteToken}`;
  const restoreRef = useRef<any>(null);

  const summary = useMemo(() => calcRSVPSummary(rsvpEntries), [rsvpEntries]);
  const dietary = useMemo(() => getDietarySummary(rsvpEntries).slice(0, 5), [rsvpEntries]);

  const handleBackup = useCallback(async () => {
    try {
      const snap = await getDoc(invitationDocRef(inviteToken));
      if (!snap.exists()) return;
      const { bankInfo: _bank, ...safeData } = snap.data();
      const data = [{ id: snap.id, ...safeData }];
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-${inviteToken}-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast("error", t("errors.backupFailed"));
    }
  }, [inviteToken, t, addToast]);

  const handleRestore = useCallback(async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { e.target.value = ""; return; }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data) || !data.length || !data[0].id) { e.target.value = ""; return; }
      for (const item of data) {
        if (!item.id || typeof item.id !== "string") continue;
        const { id, bankInfo, ...rest } = item;
        if (bankInfo && bankInfo !== "[REDACTED]") rest.bankInfo = bankInfo;
        await updateDoc(invitationDocRef(id), rest);
      }
      if (onRestore) await onRestore();
    } catch {
      addToast("error", t("errors.restoreFailed"));
    }
    e.target.value = "";
  }, [onRestore, t, addToast]);

  return (
    <>
      <div className="admin-stats-grid">
        <StatsCard label={t("panel.confirmed")} value={confirmedResponses} />
        <StatsCard label={t("panel.notAttending")} value={declinedResponses} />
        <StatsCard label={t("panel.noResponse")} value={summary.pending} />
        <StatsCard label={t("panel.totalGuests")} value={totalGuests} />
      </div>

      <div className="setup-help" style={{ marginBottom: "0.5rem", fontSize: "0.8rem", textAlign: "center" }}>
        {visitCount > 0 ? `👁 ${t("panel.visits", { count: visitCount })}` : t("panel.noVisits")}
      </div>

      {summary.confirmed + summary.declined > 0 && (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "1rem", textAlign: "center" }}>
          <DonutChart yes={summary.confirmed} no={summary.declined} pending={summary.pending} size={120} />
          <Legend items={[
            { label: t("panel.confirms"), value: summary.confirmed, color: "var(--accent, #22c55e)" },
            { label: t("panel.declines"), value: summary.declined, color: "#ef4444" },
            { label: t("panel.pending"), value: summary.pending, color: "#f59e0b" },
          ]} />
        </div>
      )}

      {dietary.length > 0 && (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.3rem", fontSize: "0.8rem" }}>
            {t("panel.dietaryPreferences")}
          </p>
          {dietary.map((d: any) => (
            <div key={d.item} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.15rem 0", borderBottom: "1px solid var(--setup-border)" }}>
              <span style={{ textTransform: "capitalize" }}>{d.item}</span>
              <span style={{ fontWeight: 600 }}>{d.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>
          {t("panel.publishedAt")}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
          <a href={inviteUrl} target="_blank" rel="noreferrer"
            style={{ color: "var(--setup-accent)", fontSize: "0.9rem", wordBreak: "break-all" }}>
            {inviteUrl}
          </a>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleBackup}>
          {t("panel.downloadBackup")}
        </button>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => restoreRef.current?.click()}>
          {t("panel.restoreBackup")}
        </button>
        <input ref={restoreRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleRestore} />
      </div>

      {rsvpEntries && rsvpEntries.length > 0 ? (
        <div className="admin-recent-section" style={{ marginTop: "1rem" }}>
          <p className="setup-label setup-label--tight">{t("panel.latestResponses")}</p>
          {(rsvpEntries || []).slice(0, 5).map((entry: any) => (
            <div key={entry.id} className="admin-recent-row">
              <span className="admin-recent-row__name">{entry.guestName}</span>
              <span className={`admin-recent-row__status admin-recent-row__status--${entry.attendance}`}>
                {entry.attendance === "yes" ? t("panel.withCompanions", { count: entry.companions }) : t("panel.notAttends")}
              </span>
              <span className="admin-recent-row__date">{formatDate(entry.submittedAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="setup-help">{t("panel.noResponses")}</p>
      )}
    </>
  );
});

export default PanelTab;
