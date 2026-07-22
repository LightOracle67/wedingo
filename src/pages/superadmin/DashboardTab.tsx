import { memo, useCallback, useEffect, useState } from "react";
import { getDocs, collection, doc, writeBatch, query, where } from "firebase/firestore";
import { ref, deleteObject, listAll } from "firebase/storage";
import { db, storage, RSVP_COLLECTION_REF, INVITATIONS_COLLECTION_REF } from "../../lib/firebase";
import { calcGlobalStats, formatBytes } from "../../lib/superadmin-utils";
import { MONTH_VALUE_TO_NUMBER } from "../../lib/constants";
import { logAudit } from "../../lib/audit";
import StatsCard from "../admin/StatsCard";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";

const DashboardTab = memo(function DashboardTab() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [galleryCount, setGalleryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rsvpSnap, invSnap, tokSnap, galSnap] = await Promise.all([
        getDocs(RSVP_COLLECTION_REF),
        getDocs(INVITATIONS_COLLECTION_REF),
        getDocs(collection(db, "setupTokens")),
        getDocs(collection(db, "galleryData")),
      ]);
      const rsvps = rsvpSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const invs = invSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const tokens = tokSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setInvitations(invs);
      setGalleryCount(galSnap.size);
      setStats(calcGlobalStats(invs, rsvps, tokens));
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

  const tokenUtilization = stats.tokensTotal > 0 ? Math.round((stats.tokensUsed / stats.tokensTotal) * 100) : 0;
  const rsvpRate = stats.rsvpTotal > 0 ? Math.round((stats.rsvpYes / stats.rsvpTotal) * 100) : 0;

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0 }}>
      {expired.length > 0 ? (
        <div className="setup-background-panel" style={{ marginBottom: "0.75rem", borderColor: "#e06060" }}>
          <div className="setup-background-panel__header">
            <div>
              <p className="setup-label" style={{ color: "#e06060" }}>{t("superadmin.expiredInvitations", { count: expired.length })}</p>
              <p className="setup-help">{t("superadmin.expiredText")}</p>
            </div>
            <button className="setup-button" type="button" onClick={handleCleanup} disabled={cleaning} style={{ fontSize: "0.8rem", flexShrink: 0 }}>
              {cleaning ? t("superadmin.cleaningButton") : t("superadmin.cleanButton", { count: expired.length })}
            </button>
          </div>
        </div>
      ) : null}

      <div className="admin-stats-grid">
        <StatsCard value={stats.invitationCount} label={t("superadmin.statsInvitations")} />
        <StatsCard value={stats.rsvpTotal} label={t("superadmin.statsTotalResponses")} />
        <StatsCard value={`${rsvpRate}%`} label={t("superadmin.statsConfirmationRate")} />
        <StatsCard value={stats.totalGuests} label={t("superadmin.statsTotalGuests")} />
        <StatsCard value={galleryCount} label={t("superadmin.statsGalleryImages")} />
        <StatsCard value={stats.tokensTotal} label={t("superadmin.statsTokensGenerated")} />
        <StatsCard value={`${tokenUtilization}%`} label={t("superadmin.statsTokenUtilization")} />
        <StatsCard value={formatBytes(stats.totalBytes)} label={t("superadmin.statsStorage")} />
      </div>

      <div className="support-grid" style={{ marginTop: "0.75rem" }}>
        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.responseSummary")}</p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--setup-muted)", margin: 0 }}>{t("superadmin.statsConfirmations")}</p>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#22c55e", margin: "0.2rem 0" }}>{stats.rsvpYes}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--setup-muted)", margin: 0 }}>{t("superadmin.statsDeclinations")}</p>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ef4444", margin: "0.2rem 0" }}>{stats.rsvpNo}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--setup-muted)", margin: 0 }}>{t("superadmin.statsTokensAvailable")}</p>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--setup-title)", margin: "0.2rem 0" }}>{stats.tokensAvailable}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--setup-muted)", margin: 0 }}>{t("superadmin.statsAutoTokens")}</p>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--setup-title)", margin: "0.2rem 0" }}>{stats.autoTokens}</p>
            </div>
          </div>
        </div>

        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.platformInfo")}</p>
          <div style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: "var(--setup-muted)", lineHeight: 1.8 }}>
            <p style={{ margin: 0 }}>Firebase: {import.meta.env.VITE_FIREBASE_PROJECT_ID || "—"}</p>
            <p style={{ margin: 0 }}>{t("superadmin.statsInvitations")}: {stats.invitationCount}</p>
            <p style={{ margin: 0 }}>RSVPs: {stats.rsvpTotal}</p>
            <p style={{ margin: 0 }}>{t("superadmin.statsTokensGenerated")}: {stats.tokensTotal}</p>
            <p style={{ margin: 0 }}>Gallery: {galleryCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DashboardTab;
