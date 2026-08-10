/**
 * SupportTab — Centro de soporte del superadmin (sin Blaze).
 *
 * Agrupa herramientas de apoyo calculadas en cliente:
 * - INBOX de avisos: bodas próximas (≤14 días), invitaciones sin configurar,
 *   tokens legacy por migrar y sesiones activas ahora.
 * - CONSOLA por invitación: dado un token, resumen (nombres, fecha, visitas,
 *   RSVP, sesión, última actividad) y accesos rápidos.
 * - DIAGNÓSTICO de conectividad: verifica que las lecturas de Firestore
 *   responden correctamente.
 */
import { memo, useCallback, useEffect, useState } from "react";
import { getDocs, collection, query, where, limit } from "firebase/firestore";
import { db, INVITATIONS_COLLECTION_REF, rsvpByInviteRef } from "../../lib/firebase";
import { useTranslation } from "react-i18next";

interface AlertInfo {
  id: string;
  names: string;
  weddingLabel: string;
  daysLeft: number | null;
  empty: boolean;
  legacy: boolean;
  session: boolean;
}

const SupportTab = memo(function SupportTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState<AlertInfo[]>([]);
  const [queryToken, setQueryToken] = useState("");
  const [result, setResult] = useState<null | {
    id: string;
    names: string;
    adminUsername: string;
    weddingLabel: string;
    visits: number;
    rsvpCount: number;
    hasSession: boolean;
    lastActivity: string;
    createdAt: string;
  }>(null);
  const [searching, setSearching] = useState(false);
  const [diag, setDiag] = useState<null | { invitations: boolean; tokens: boolean }>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [invSnap, legacySnap] = await Promise.all([
        getDocs(INVITATIONS_COLLECTION_REF),
        getDocs(query(collection(db, "invitations"), where("_activeSetupToken", "!=", ""), limit(200))),
      ]);
      const legacyIds = new Set(legacySnap.docs.map((d) => d.id));
      const now = Date.now();
      const list: AlertInfo[] = invSnap.docs.map((d) => {
        const data = d.data();
        const names = [data.firstName, data.secondName].filter(Boolean).join(" & ");
        const weddingLabel =
          data.weddingDay && data.weddingMonth && data.weddingYear
            ? `${data.weddingDay}/${data.weddingMonth}/${data.weddingYear}`
            : "";
        let daysLeft: number | null = null;
        if (data.weddingDay && data.weddingMonth && data.weddingYear) {
          const numMonth = Number(data.weddingMonth);
          const month = Number.isFinite(numMonth) && numMonth >= 1 && numMonth <= 12 ? numMonth - 1 : 0;
          const wd = new Date(Number(data.weddingYear), month, Number(data.weddingDay));
          if (!Number.isNaN(wd.getTime())) daysLeft = Math.ceil((wd.getTime() - now) / 86400000);
        }
        return {
          id: d.id,
          names,
          weddingLabel,
          daysLeft,
          empty: !names,
          legacy: legacyIds.has(d.id),
          session: !!data.activeSession,
        };
      });
      setAlerts(list);
      setError("");
    } catch {
      setError(t("superadmin.invitationLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const upcoming = alerts.filter((a) => a.daysLeft !== null && a.daysLeft >= 0 && a.daysLeft <= 14);
  const empty = alerts.filter((a) => a.empty);
  const legacy = alerts.filter((a) => a.legacy);
  const sessions = alerts.filter((a) => a.session);

  const searchToken = useCallback(async () => {
    const token = queryToken.trim();
    if (!token) return;
    setSearching(true);
    setResult(null);
    setError("");
    try {
      const invDoc = await getDocs(query(collection(db, "invitations"), where("__name__", "==", token), limit(1)));
      if (invDoc.empty) {
        setError(t("superadmin.support.notFound"));
        setSearching(false);
        return;
      }
      const data = invDoc.docs[0]!.data();
      const rsvpSnap = await getDocs(rsvpByInviteRef(token));
      const sessionAt = data.activeSession as { seconds?: number } | null | undefined;
      setResult({
        id: token,
        names: [data.firstName, data.secondName].filter(Boolean).join(" & ") || t("superadmin.data.emptyInvitation"),
        adminUsername: String(data.adminUsername || "—"),
        weddingLabel:
          data.weddingDay && data.weddingMonth && data.weddingYear
            ? `${data.weddingDay}/${data.weddingMonth}/${data.weddingYear}`
            : "—",
        visits: Number(data._visits) || 0,
        rsvpCount: rsvpSnap.docs.length,
        hasSession: !!data.activeSession,
        lastActivity:
          sessionAt && typeof sessionAt === "object" && "seconds" in sessionAt
            ? new Date(Number(sessionAt.seconds) * 1000).toLocaleString()
            : "—",
        createdAt: String(data.createdAt || "—"),
      });
    } catch {
      setError(t("errors.dataLoadFailed"));
    }
    setSearching(false);
  }, [queryToken, t]);

  const runDiagnostics = useCallback(async () => {
    setDiag(null);
    try {
      const inv = await getDocs(query(INVITATIONS_COLLECTION_REF, limit(1)));
      const tk = await getDocs(query(collection(db, "setupTokens"), limit(1)));
      setDiag({ invitations: !inv.empty || true, tokens: !tk.empty || true });
    } catch {
      setDiag({ invitations: false, tokens: false });
    }
  }, []);

  if (loading) {
    return (
      <p className="setup-subtitle" style={{ textAlign: "center" }}>
        {t("superadmin.dashboardLoading")}
      </p>
    );
  }

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0, gap: "0.75rem" }}>
      {error ? <p className="setup-error">{error}</p> : null}

      {/* ── Inbox: avisos ── */}
      <div className="support-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.support.upcomingTitle")}</p>
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--setup-title)", margin: 0 }}>{upcoming.length}</p>
          <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem", fontSize: "0.78rem", color: "var(--setup-subtitle)" }}>
            {upcoming.slice(0, 6).map((a) => (
              <li key={a.id}>
                <code>{a.id}</code> — {a.weddingLabel} ({a.daysLeft} {t("superadmin.support.days")})
              </li>
            ))}
          </ul>
        </div>
        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.support.emptyTitle")}</p>
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--setup-title)", margin: 0 }}>{empty.length}</p>
          <p className="setup-help" style={{ margin: "0.2rem 0 0", fontSize: "0.78rem" }}>{t("superadmin.support.emptyHint")}</p>
        </div>
        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.support.legacyTitle")}</p>
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--setup-title)", margin: 0 }}>{legacy.length}</p>
          <p className="setup-help" style={{ margin: "0.2rem 0 0", fontSize: "0.78rem" }}>{t("superadmin.support.legacyHint")}</p>
        </div>
        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.support.sessionsTitle")}</p>
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--setup-title)", margin: 0 }}>{sessions.length}</p>
          <p className="setup-help" style={{ margin: "0.2rem 0 0", fontSize: "0.78rem" }}>{t("superadmin.support.sessionsHint")}</p>
        </div>
      </div>

      {/* ── Consola por invitación ── */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("superadmin.support.consoleTitle")}</p>
        <div className="admin-filters" style={{ margin: "0.4rem 0 0", gap: "0.5rem" }}>
          <input
            className="setup-input"
            style={{ flex: 1, minWidth: "12rem", maxWidth: "20rem" }}
            value={queryToken}
            onChange={(e) => setQueryToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void searchToken();
            }}
            placeholder={t("superadmin.support.tokenPlaceholder")}
            aria-label={t("superadmin.support.tokenPlaceholder")}
            autoComplete="off"
          />
          <button type="button" className="setup-button setup-button--compact" onClick={() => void searchToken()} disabled={searching || !queryToken.trim()}>
            {searching ? t("common.loading") : t("superadmin.support.searchBtn")}
          </button>
        </div>
        {result ? (
          <div className="setup-background-panel" style={{ marginTop: "0.6rem", fontSize: "0.85rem" }}>
            <p className="setup-label">{result.names}</p>
            <p className="setup-help" style={{ margin: "0.2rem 0 0" }}>
              {t("superadmin.support.token")}: <code>{result.id}</code> · {t("superadmin.tableUser")}: {result.adminUsername}
            </p>
            <p className="setup-help" style={{ margin: "0.2rem 0 0" }}>
              {t("superadmin.tableDate")}: {result.weddingLabel} · {t("superadmin.metrics.visits")}: {result.visits} · {t("superadmin.metrics.rsvps")}: {result.rsvpCount}
            </p>
            <p className="setup-help" style={{ margin: "0.2rem 0 0" }}>
              {t("superadmin.support.session")}: {result.hasSession ? t("superadmin.sessionActive") : t("superadmin.sessionInactive")} · {t("superadmin.support.lastActivity")}: {result.lastActivity}
            </p>
            <div className="admin-flex" style={{ gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <a className="setup-button setup-button--ghost setup-button--compact" href={`/${result.id}`} target="_blank" rel="noreferrer">
                {t("superadmin.support.openInvitation")}
              </a>
              <a className="setup-button setup-button--ghost setup-button--compact" href={`/${result.id}/admin`} target="_blank" rel="noreferrer">
                {t("superadmin.data.adminLink")}
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Diagnóstico de conectividad ── */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("superadmin.support.diagTitle")}</p>
        <div className="admin-flex" style={{ gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
          <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void runDiagnostics()}>
            {t("superadmin.support.diagBtn")}
          </button>
          {diag ? (
            <span className="setup-help" style={{ margin: 0 }}>
              {t("superadmin.support.invitations")}: {diag.invitations ? "✅" : "❌"} · {t("superadmin.support.tokens")}: {diag.tokens ? "✅" : "❌"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default SupportTab;
