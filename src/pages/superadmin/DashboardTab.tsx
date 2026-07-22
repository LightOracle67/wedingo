import { memo, useCallback, useEffect, useState } from "react";
import { getDocs, collection, doc, writeBatch, query, where } from "firebase/firestore";
import { ref, deleteObject, listAll } from "firebase/storage";
import { db, storage, RSVP_COLLECTION_REF, INVITATIONS_COLLECTION_REF } from "../../lib/firebase";
import { calcGlobalStats, tokenUsageOverTime, rsvpOverTime } from "../../lib/superadmin-utils";
import { MONTH_VALUE_TO_NUMBER } from "../../lib/constants";
import { logAudit } from "../../lib/audit";
import { DonutChart, MiniBar, Legend } from "../../components/AttendanceChart";
import StatsCard from "../admin/StatsCard";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";

const DashboardTab = memo(function DashboardTab() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [tokenTimeline, setTokenTimeline] = useState<any[]>([]);
  const [rsvpTimeline, setRsvpTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rsvpSnap, invSnap, tokSnap] = await Promise.all([
        getDocs(RSVP_COLLECTION_REF),
        getDocs(INVITATIONS_COLLECTION_REF),
        getDocs(collection(db, "setupTokens")),
      ]);
      const rsvps = rsvpSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const invs = invSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const tokens = tokSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setInvitations(invs);
      setStats(calcGlobalStats(invs, rsvps, tokens));
      setTokenTimeline(tokenUsageOverTime(tokens));
      setRsvpTimeline(rsvpOverTime(rsvps));
    } catch {
      addToast("error", t("errors.statsLoadFailed"));
    } finally { setLoading(false); }
  }, [addToast, t]);

  useEffect(() => { load(); }, [load]);

  const twelveMonthsAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

  const expired = invitations.filter((inv) => {
    if (!inv.weddingYear || !inv.weddingMonth) return false;
    const monthIndex = ((MONTH_VALUE_TO_NUMBER as any)[inv.weddingMonth] || 1) - 1;
    const day = Number(inv.weddingDay) || 1;
    const d = new Date(Number(inv.weddingYear), monthIndex, day);
    return d.getTime() > 0 && d.getTime() < twelveMonthsAgo;
  });

  const handleCleanup = useCallback(async () => {
    if (!window.confirm(t("superadmin.cleanConfirm", { count: expired.length }))) return;
    setCleaning(true);
    let count = 0;
    for (const inv of expired) {
      try {
        const batch = writeBatch(db);
        const rsvpQ = query(RSVP_COLLECTION_REF, where("inviteToken", "==", inv.id));
        const rsvpSnap = await getDocs(rsvpQ);
        rsvpSnap.docs.forEach((d: any) => batch.delete(d.ref));
        const tokQ = query(collection(db, "setupTokens"), where("inviteToken", "==", inv.id));
        const tokSnap = await getDocs(tokQ);
        tokSnap.docs.forEach((d: any) => batch.delete(d.ref));
        batch.delete(doc(INVITATIONS_COLLECTION_REF, inv.id));
        await batch.commit();
        try {
          const prefix = `invitations/${inv.id}/`;
          const list = await listAll(ref(storage, prefix));
          await Promise.allSettled(list.items.map((item) => deleteObject(item)));
        } catch {}
        count++;
      } catch {}
    }
    await logAudit("cleanup_expired", `Eliminadas ${count} invitaciones expiradas`);
    setCleaning(false);
    await load();
  }, [expired, load, t]);

  if (loading) return <p className="setup-subtitle" style={{ textAlign: "center" }}>{t("superadmin.dashboardLoading")}</p>;
  if (!stats) return <p className="setup-error">{t("superadmin.dashboardError")}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {expired.length > 0 ? (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem", borderColor: "#e06060" }}>
          <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.9rem" }}>
            {t("superadmin.expiredInvitations", { count: expired.length })}
          </p>
          <p className="setup-help" style={{ margin: "0.3rem 0" }}>
            {t("superadmin.expiredText")}
          </p>
          <button className="setup-button" type="button" onClick={handleCleanup} disabled={cleaning} style={{ fontSize: "0.85rem" }}>
            {cleaning ? t("superadmin.cleaningButton") : t("superadmin.cleanButton", { count: expired.length })}
          </button>
        </div>
      ) : null}

      <div className="admin-stats-grid">
        <StatsCard value={stats.rsvpTotal} label={t("superadmin.statsTotalResponses")} />
        <StatsCard value={stats.rsvpYes} label={t("superadmin.statsConfirmations")} />
        <StatsCard value={stats.rsvpNo} label={t("superadmin.statsDeclinations")} />
        <StatsCard value={stats.totalGuests} label={t("superadmin.statsTotalGuests")} />
        <StatsCard value={stats.tokensTotal} label={t("superadmin.statsTokensGenerated")} />
        <StatsCard value={stats.tokensUsed} label={t("superadmin.statsTokensUsed")} />
        <StatsCard value={stats.tokensAvailable} label={t("superadmin.statsTokensAvailable")} />
        <StatsCard value={stats.invitationCount} label={t("superadmin.statsInvitations")} />
      </div>

      {stats.rsvpTotal > 0 && (
        <div className="setup-token-card" style={{ marginTop: "1rem", padding: "1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.5rem" }}>{t("superadmin.responseDistribution")}</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart yes={stats.rsvpYes} no={stats.rsvpNo} pending={0} size={140} />
          </div>
          <Legend items={[
            { label: t("superadmin.statsConfirmations"), value: stats.rsvpYes, color: "var(--accent, #22c55e)" },
            { label: t("superadmin.statsDeclinations"), value: stats.rsvpNo, color: "#ef4444" },
          ]} />
        </div>
      )}

      {rsvpTimeline.length > 1 && (
        <div className="setup-token-card" style={{ marginTop: "1rem", padding: "1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.5rem" }}>{t("superadmin.responsesByDay")}</p>
          <MiniBar items={rsvpTimeline.map((d: any) => ({ label: d.date.slice(5), value: d.total }))} height={100} color="var(--accent, #22c55e)" />
        </div>
      )}

      {tokenTimeline.length > 1 && (
        <div className="setup-token-card" style={{ marginTop: "1rem", padding: "1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.5rem" }}>{t("superadmin.tokensByDay")}</p>
          <MiniBar items={tokenTimeline.map((d: any) => ({ label: d.date.slice(5), value: d.count }))} height={100} color="#8b5cf6" />
        </div>
      )}

      <div className="setup-token-card" style={{ marginTop: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>
          Firebase: {import.meta.env.VITE_FIREBASE_PROJECT_ID || "—"}
        </p>
      </div>
    </div>
  );
});

export default DashboardTab;
