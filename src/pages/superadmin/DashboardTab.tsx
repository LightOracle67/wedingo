import { memo, useCallback, useEffect, useState } from "react";
import {
  getDocs,
  doc,
  writeBatch,
  collection,
  query,
  where,
  orderBy,
  limit,
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
import { safeLogError } from "../../lib/safe-error";
import { logAudit } from "../../lib/audit";
import { usePlatformSettings } from "../../lib/platform-settings";
import StatsCard from "../admin/StatsCard";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../contexts/ConfirmContext";

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
  const { confirm } = useConfirm();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [invitations, setInvitations] = useState<InvitationDoc[]>([]);
  // F2-1 actividad reciente, F2-3 confirmaciones/día, F2-6 comparativa de temas,
  // F2-2 invitaciones con más visitas sin confirmar.
  const [recentActivity, setRecentActivity] = useState<Array<{ action: string; detail: string; ts: number }>>([]);
  const [dailyCounts, setDailyCounts] = useState<Array<{ day: string; count: number }>>([]);
  const [themeCounts, setThemeCounts] = useState<Array<{ theme: string; count: number }>>([]);
  const [topVisits, setTopVisits] = useState<Array<{ id: string; visits: number; rsvp: number }>>([]);

  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  // F3-9: umbral de expiración (días) desde los ajustes de plataforma.
  const { settings: platform } = usePlatformSettings();
  const expiringDays = Math.max(1, Number(platform.expiringDays) || 30);

  const load = useCallback(async () => {
    // Cada fuente se aísla: si una falla (p. ej. setupTokens o auditLog), el
    // resto del panel sigue cargando en lugar de mostrar "no se pudieron
    // cargar las estadísticas". El error real se registra para diagnóstico.
    let rsvps: Array<Record<string, unknown>> = [];
    let invitationDocs: Array<Record<string, unknown>> = [];
    let tokens: Array<Record<string, unknown>> = [];
    let baseOk = true;
    try {
      const [rsvpSnap, invSnap, tokenSnap] = await Promise.all([
        getDocs(RSVP_RESPONSES_GROUP),
        getDocs(INVITATIONS_COLLECTION_REF),
        getDocs(collection(db, "setupTokens")),
      ]);
      rsvps = rsvpSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
      invitationDocs = invSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
      setInvitations(invitationDocs as InvitationDoc[]);
      const invitationIds = new Set(invSnap.docs.map((d) => d.id));
      tokens = tokenSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        used: invitationIds.has(String(d.data().inviteToken)),
      }));
      setStats(calcGlobalStats(invitationDocs, rsvps, tokens));
    } catch (err) {
      baseOk = false;
      safeLogError(["[app]", "[superadmin]", "stats base load failed"], err);
      addToast("error", t("errors.statsLoadFailed"));
    }

    // F2-3: confirmaciones por día (últimos 7 días) para el histograma.
    try {
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days[d.toISOString().slice(0, 10)] = 0;
      }
      for (const r of rsvps) {
        const raw = r.submittedAt as unknown;
        let ts = 0;
        if (raw && typeof raw === "object" && "seconds" in (raw as { seconds?: unknown })) {
          ts = Number((raw as { seconds: number }).seconds) * 1000;
        } else if (typeof raw === "number") ts = raw;
        else if (typeof raw === "string") ts = Date.parse(raw);
        if (!ts) continue;
        const key = new Date(ts).toISOString().slice(0, 10);
        if (key in days) days[key] = (days[key] || 0) + 1;
      }
      setDailyCounts(Object.entries(days).map(([day, count]) => ({ day, count })));
    } catch {}

    // F2-6: comparativa de temas.
    try {
      const themes: Record<string, number> = {};
      for (const inv of invitationDocs) {
        const th = String(inv.theme || "sin tema");
        themes[th] = (themes[th] || 0) + 1;
      }
      setThemeCounts(Object.entries(themes).sort((a, b) => b[1] - a[1]).map(([theme, count]) => ({ theme, count })));
    } catch {}

    // F2-2: invitaciones con más visitas sin confirmar (embudo).
    try {
      const rsvpByToken: Record<string, number> = {};
      for (const r of rsvps) {
        const tk = String(r.inviteToken || "");
        if (tk) rsvpByToken[tk] = (rsvpByToken[tk] || 0) + 1;
      }
      const withVisits = invitationDocs
        .map((d) => ({
          id: String(d.id),
          visits: Number(d._visits) || 0,
          rsvp: rsvpByToken[String(d.id)] || 0,
        }))
        .filter((x) => x.visits > 0)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);
      setTopVisits(withVisits);
    } catch {}

    // F2-1: actividad reciente (últimos 10 eventos de auditoría).
    try {
      const auditSnap = await getDocs(query(collection(db, "auditLog"), orderBy("createdAt", "desc"), limit(10)));
      setRecentActivity(
        auditSnap.docs.map((d) => {
          const data = d.data();
          const raw = data.createdAt as { seconds?: unknown } | null | undefined;
          const ts = raw && typeof raw === "object" && "seconds" in raw ? Number(raw.seconds) * 1000 : 0;
          return { action: String(data.action || ""), detail: String(data.detail || ""), ts };
        }),
      );
    } catch (err) {
      safeLogError(["[app]", "[superadmin]", "stats auditLog failed"], err);
      setRecentActivity([]);
    }

    setLoading(false);
    void baseOk;
  }, [addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const twelveMonthsAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

  // F3-9: invitaciones que expiran pronto (dentro del umbral configurado).
  const expiringSoon = invitations
    .filter((inv) => {
      if (!inv.weddingYear || !inv.weddingMonth) return false;
      const monthIndex = (MONTH_VALUE_TO_NUMBER[inv.weddingMonth] || 1) - 1;
      const day = Number(inv.weddingDay) || 1;
      const d = new Date(Number(inv.weddingYear), monthIndex, day).getTime();
      if (!(d > 0)) return false;
      return d >= Date.now() && d <= Date.now() + expiringDays * 86400000;
    })
    .map((inv) => `${String(inv.weddingDay || 1)} ${String(inv.weddingMonth || "")} ${String(inv.weddingYear || "")} (${inv.id})`)
    .slice(0, 8);

  // Agenda de bodas: próximos eventos ordenados por fecha.
  const upcomingWeddings = invitations
    .filter((inv) => inv.weddingYear && inv.weddingMonth)
    .map((inv) => {
      const monthIndex = (inv.weddingMonth ? MONTH_VALUE_TO_NUMBER[inv.weddingMonth] || 1 : 1) - 1;
      const day = Number(inv.weddingDay) || 1;
      const ts = new Date(Number(inv.weddingYear), monthIndex, day).getTime();
      return { ts, label: `${String(inv.firstName || "?")} & ${String(inv.secondName || "?")} — ${day}/${inv.weddingMonth}/${inv.weddingYear} (${inv.id})` };
    })
    .filter((w) => w.ts > 0)
    .sort((a, b) => a.ts - b.ts)
    .slice(0, 8);

  const expired = invitations.filter((inv) => {
    // Expiración manual fijada por el superadmin (manage.manualExpiry).
    if (inv.manualExpiry) {
      return new Date(`${inv.manualExpiry}T00:00:00`).getTime() < Date.now();
    }
    if (!inv.weddingYear || !inv.weddingMonth) return false;
    const monthIndex = (MONTH_VALUE_TO_NUMBER[inv.weddingMonth] || 1) - 1;
    const day = Number(inv.weddingDay) || 1;
    const d = new Date(Number(inv.weddingYear), monthIndex, day);
    return d.getTime() > 0 && d.getTime() < twelveMonthsAgo;
  });

  /** F5-4 (F36): limpia archivos de Storage huérfanos (invitaciones ya borradas). */
  const handleStorageGC = useCallback(async () => {
    if (!(await confirm({ message: t("superadmin.gcStorageConfirm") }))) return;
    setCleaning(true);
    let removed = 0;
    try {
      const storageInstance = await getStorageInstance();
      const { ref, listAll, deleteObject } = await import("firebase/storage");
      const rootRef = ref(storageInstance, "invitations/");
      const root = await listAll(rootRef);
      const existing = new Set((await getDocs(INVITATIONS_COLLECTION_REF)).docs.map((d) => d.id));
      for (const prefix of root.prefixes) {
        const token = prefix.name.replace(/\/$/, "");
        if (existing.has(token)) continue;
        // Invitación borrada: borra todos sus archivos.
        const files = await listAll(prefix);
        await Promise.allSettled(files.items.map((item) => deleteObject(item)));
        for (const sub of files.prefixes) {
          const subFiles = await listAll(sub);
          await Promise.allSettled(subFiles.items.map((item) => deleteObject(item)));
        }
        removed += files.items.length + (await Promise.all(files.prefixes.map(async (sub) => (await listAll(sub)).items.length))).reduce((a, b) => a + b, 0);
      }
      addToast("success", t("superadmin.gcStorageDone", { count: removed }));
    } catch {
      addToast("error", t("errors.statsLoadFailed"));
    } finally {
      setCleaning(false);
    }
  }, [addToast, t, confirm]);

  const handleCleanup = useCallback(async () => {
    if (!(await confirm({ message: t("superadmin.cleanConfirm", { count: expired.length }) }))) return;
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
        const SUB_COLLECTIONS = ["gallery", "audio", "configImages", "reactions", "notes", "songs", "rides", "gifts", "_counters", "consentLog", "accessLog", "confirmedPeople", "_backup", "venuepoints", "dayphotos", "mailbox", "toasts", "visitLog", "sections"];
        for (const name of SUB_COLLECTIONS) {
          const subSnap = await getDocs(collection(db, "invitations", invitation.id, name));
          subSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref));
        }
        // Las mesas de cada sección guardan nombres completos de invitados
        // (GDPR art. 17): se recorren y añaden al batch de borrado.
        const sectionsSnap = await getDocs(collection(db, "invitations", invitation.id, "sections"));
        for (const sec of sectionsSnap.docs) {
          const tablesSnap = await getDocs(collection(db, "invitations", invitation.id, "sections", sec.id, "tables"));
          tablesSnap.docs.forEach((t: QueryDocumentSnapshot<DocumentData>) => batch.delete(t.ref));
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
        safeLogError(["[app]", "[superadmin]", "cleanup delete failed"], err);
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
  }, [expired, load, t, addToast, confirm]);

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
            <button
              className="setup-button setup-button--ghost"
              type="button"
              onClick={handleStorageGC}
              disabled={cleaning}
              style={{ fontSize: "0.8rem", flexShrink: 0 }}
            >
              {t("superadmin.gcStorage")}
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

      {/* ── F2-3: Confirmaciones por día (histograma) ── */}
      <div className="setup-background-panel" style={{ marginTop: "0.75rem" }}>
        <p className="setup-label">{t("superadmin.dailyConfirmations")}</p>
        <div className="admin-flex" style={{ alignItems: "flex-end", gap: "0.3rem", minHeight: "4.5rem" }}>
          {dailyCounts.map(({ day, count }) => (
            <div key={day} style={{ flex: 1, textAlign: "center" }}>
              <div
                title={`${day}: ${count}`}
                style={{
                  height: `${Math.max(4, Math.min(64, count * 8))}px`,
                  background: "var(--setup-accent)",
                  borderRadius: "0.3rem 0.3rem 0 0",
                  opacity: 0.85,
                  minWidth: "1rem",
                }}
              />
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.6rem", color: "var(--setup-muted)" }}>{day.slice(5)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── F2-2: Embudo (más visitas sin confirmar) ── */}
      {topVisits.length > 0 ? (
        <div className="setup-background-panel" style={{ marginTop: "0.75rem" }}>
          <p className="setup-label">{t("superadmin.topVisits")}</p>
          <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--setup-subtitle)" }}>
            {topVisits.map((v) => (
              <li key={v.id} style={{ marginBottom: "0.2rem" }}>
                {v.id} — {v.visits} {t("superadmin.visitsWord")} · {v.rsvp} {t("superadmin.rsvpsWord")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── F2-6: Comparativa de temas ── */}
      <div className="setup-background-panel" style={{ marginTop: "0.75rem" }}>
        <p className="setup-label">{t("superadmin.themeComparison")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
          {themeCounts.map(({ theme, count }) => (
            <span
              key={theme}
              className="setup-token-card"
              style={{ padding: "0.3rem 0.7rem", fontSize: "0.75rem", color: "var(--setup-title)" }}
            >
              {theme}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* ── F3-9: invitaciones por expirar ── */}
      {expiringSoon.length > 0 ? (
        <div className="setup-background-panel" style={{ marginTop: "0.75rem", borderColor: "#e0a54a" }}>
          <p className="setup-label">{t("superadmin.expiringSoon", { days: expiringDays })}</p>
          <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--setup-subtitle)" }}>
            {expiringSoon.map((e, i) => (
              <li key={i} style={{ marginBottom: "0.2rem" }}>
                {e}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Agenda de bodas (próximas) ── */}
      {upcomingWeddings.length > 0 ? (
        <div className="setup-background-panel" style={{ marginTop: "0.75rem" }}>
          <p className="setup-label">{t("superadmin.upcomingWeddings")}</p>
          <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--setup-subtitle)" }}>
            {upcomingWeddings.map((w, i) => (
              <li key={i} style={{ marginBottom: "0.2rem" }}>
                {w.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── F2-1: Actividad reciente ── */}
      <div className="setup-background-panel" style={{ marginTop: "0.75rem" }}>
        <p className="setup-label">{t("superadmin.recentActivity")}</p>
        {recentActivity.length === 0 ? (
          <p className="setup-help" style={{ margin: 0 }}>
            {t("superadmin.noActivity")}
          </p>
        ) : (
          <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--setup-subtitle)" }}>
            {recentActivity.map((a, i) => (
              <li key={i} style={{ marginBottom: "0.2rem" }}>
                <strong>{a.action}</strong>
                {a.detail ? ` — ${a.detail}` : ""}
                {a.ts ? <span style={{ color: "var(--setup-muted)" }}> · {new Date(a.ts).toLocaleString()}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

export default DashboardTab;
