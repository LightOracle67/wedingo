import { memo, useCallback, useEffect, useState } from "react";
import {
  getDocs,
  doc,
  writeBatch,
  collection,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  db,
  getStorageInstance,
  RSVP_RESPONSES_GROUP,
  rsvpByInviteRef,
  INVITATIONS_COLLECTION_REF,
} from "../../lib/firebase";
import { calcGlobalStats, formatBytes } from "../../lib/superadmin-utils";
import { MONTH_VALUE_TO_NUMBER } from "../../lib/constants";
import { logAudit } from "../../lib/audit";
import StatsCard from "../admin/StatsCard";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";

interface GlobalStats {
  rsvpTotal: number;
  rsvpYes: number;
  rsvpNo: number;
  totalGuests: number;
  invitationCount: number;
  totalBytes: number;
  tokensTotal: number;
  tokensUsed: number;
  tokensAvailable: number;
  autoTokens: number;
  manualTokens: number;
}

interface InvitationDoc {
  id: string;
  weddingYear?: string;
  weddingMonth?: string;
  weddingDay?: string;
  [key: string]: unknown;
}

const DashboardTab = memo(function DashboardTab() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [invitations, setInvitations] = useState<InvitationDoc[]>([]);

  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rsvpSnap, invSnap, tokenSnap] = await Promise.all([
        getDocs(RSVP_RESPONSES_GROUP),
        getDocs(INVITATIONS_COLLECTION_REF),
        getDocs(collection(db, "setupTokens")),
      ]);
      const rsvps = rsvpSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
      const invitationDocs = invSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
      setInvitations(invitationDocs as InvitationDoc[]);
      // Las stats de tokens se calculan de verdad: un token es "usado" si su
      // invitación asociada existe (antes se pasaba un array vacío y todo
      // salía a 0).
      const invitationIds = new Set(invSnap.docs.map((d) => d.id));
      const tokens = tokenSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        used: invitationIds.has(String(d.data().inviteToken)),
      }));
      setStats(calcGlobalStats(invitationDocs, rsvps, tokens));
    } catch {
      addToast("error", t("errors.statsLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const twelveMonthsAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

  const expired = invitations.filter((inv) => {
    if (!inv.weddingYear || !inv.weddingMonth) return false;
    const monthIndex = (MONTH_VALUE_TO_NUMBER[inv.weddingMonth] || 1) - 1;
    const day = Number(inv.weddingDay) || 1;
    const d = new Date(Number(inv.weddingYear), monthIndex, day);
    return d.getTime() > 0 && d.getTime() < twelveMonthsAgo;
  });

  const handleCleanup = useCallback(async () => {
    if (!window.confirm(t("superadmin.cleanConfirm", { count: expired.length }))) return;
    setCleaning(true);
    let deleted = 0;
    let failed = 0;
    for (const invitation of expired) {
      try {
        const batch = writeBatch(db);
        // Las respuestas viven en la subcolección rsvpResponses/{id}/responses.
        const rsvpSnap = await getDocs(rsvpByInviteRef(invitation.id));
        rsvpSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref));
        // Subcolecciones de la invitación (medios y FUNCIONES SOCIALES con
        // datos de invitados) + consentLog (consentimiento de cookies): no
        // dejar datos personales huérfanos (GDPR art. 17).
        const SUB_COLLECTIONS = ["gallery", "audio", "configImages", "reactions", "notes", "songs", "rides", "gifts", "_counters", "consentLog"];
        for (const name of SUB_COLLECTIONS) {
          const subSnap = await getDocs(collection(db, "invitations", invitation.id, name));
          subSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref));
        }
        // Registros de tokens de setup (hash → inviteToken): sin borrarlos
        // quedan hashes huérfanos apuntando a una invitación inexistente.
        const tokenSnap = await getDocs(
          query(collection(db, "setupTokens"), where("inviteToken", "==", invitation.id)),
        );
        tokenSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref));
        batch.delete(doc(db, "rsvpResponses", invitation.id));
        batch.delete(doc(INVITATIONS_COLLECTION_REF, invitation.id));
        // Se borra primero el documento principal: si algo falla después, las
        // subcolecciones quedan huérfanas pero INACCESIBLES (el doc no existe),
        // en vez de una invitación rota visible. (Antes era al revés.)
        await batch.commit();
        const { deleteGallery, deleteAllConfigImages } = await import("../../lib/image-store");
        const { deleteAudio } = await import("../../lib/music-store");
        await deleteGallery(invitation.id);
        await deleteAllConfigImages(invitation.id);
        await deleteAudio(invitation.id);
        try {
          const prefix = `invitations/${invitation.id}/`;
          const storageInstance = await getStorageInstance();
          // firebase/storage se importa solo aquí (uso exclusivo de superadmin)
          // para no cargar su SDK en el bundle inicial de la app.
          const { ref, listAll, deleteObject } = await import("firebase/storage");
          const list = await listAll(ref(storageInstance, prefix));
          await Promise.allSettled(list.items.map((item) => deleteObject(item)));
        } catch {}
        deleted++;
      } catch (err) {
        failed++;
        console.error("[app]", "[superadmin]", "cleanup delete failed", { id: invitation.id, error: err });
      }
    }
    // Registro honesto del resultado en la auditoría (sin falsear el conteo).
    await logAudit(
      "cleanup_expired",
      `Eliminadas ${deleted} invitaciones expiradas${failed ? ` (${failed} fallos)` : ""}`,
    );
    if (addToast) {
      addToast(deleted > 0 ? "success" : "info", t("superadmin.cleanupDone", { deleted, failed }));
    }
    setCleaning(false);
    await load();
  }, [expired, load, t, addToast]);

  if (loading)
    return (
      <p className="setup-subtitle" style={{ textAlign: "center" }}>
        {t("superadmin.dashboardLoading")}
      </p>
    );
  if (!stats) {
    return (
      <div
        className="admin-flex--col"
        style={{
          height: "100%",
          minHeight: 0,
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--setup-muted)", fontSize: "0.9rem", margin: 0 }}>{t("superadmin.dashboardEmpty")}</p>
      </div>
    );
  }

  const rsvpRate = stats.rsvpTotal > 0 ? Math.round((stats.rsvpYes / stats.rsvpTotal) * 100) : 0;

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0 }}>
      {expired.length > 0 ? (
        <div className="setup-background-panel" style={{ marginBottom: "0.75rem", borderColor: "#e06060" }}>
          <div className="setup-background-panel__header">
            <div>
              <p className="setup-label" style={{ color: "#e06060" }}>
                {t("superadmin.expiredInvitations", { count: expired.length })}
              </p>
              <p className="setup-help">{t("superadmin.expiredText")}</p>
            </div>
            <button
              className="setup-button"
              type="button"
              onClick={handleCleanup}
              disabled={cleaning}
              style={{ fontSize: "0.8rem", flexShrink: 0 }}
            >
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
        <StatsCard value={formatBytes(stats.totalBytes)} label={t("superadmin.statsStorage")} />
      </div>

      <div className="support-grid" style={{ marginTop: "0.75rem" }}>
        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.responseSummary")}</p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--setup-muted)", margin: 0 }}>
                {t("superadmin.statsConfirmations")}
              </p>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#22c55e", margin: "0.2rem 0" }}>
                {stats.rsvpYes}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--setup-muted)", margin: 0 }}>
                {t("superadmin.statsDeclinations")}
              </p>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ef4444", margin: "0.2rem 0" }}>
                {stats.rsvpNo}
              </p>
            </div>
          </div>
        </div>

        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.platformInfo")}</p>
          <div style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: "var(--setup-muted)", lineHeight: 1.8 }}>
            <p style={{ margin: 0 }}>
              {t("superadmin.firebaseLabel")}: {import.meta.env.VITE_FIREBASE_PROJECT_ID || "—"}
            </p>
            <p style={{ margin: 0 }}>
              {t("superadmin.statsInvitations")}: {stats.invitationCount}
            </p>
            <p style={{ margin: 0 }}>
              {t("superadmin.rsvpsLabel")}: {stats.rsvpTotal}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DashboardTab;
