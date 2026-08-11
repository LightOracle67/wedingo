/**
 * MetricsTab — Métricas globales del superadmin (sin Blaze).
 *
 * Agrega datos de TODAS las invitaciones calculados en cliente:
 * - Resumen: invitaciones, visitas, RSVP, confirmados/declinados/acompañantes.
 * - Funnel de conversión por invitación (visitas → RSVP → % conversión).
 * - Ranking por actividad (RSVP y visitas).
 * - Crecimiento: invitaciones creadas por mes (últimos 12 meses).
 * - Reporte de almacenamiento (galería/audio) por invitación (bajo demanda).
 * - Export global en CSV de todas las confirmaciones.
 */
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { INVITATIONS_COLLECTION_REF, rsvpByInviteRef, db } from "../../lib/firebase";
import { useTranslation } from "react-i18next";

interface InvRow {
  id: string;
  firstName: string;
  secondName: string;
  adminUsername: string;
  weddingDay: string;
  weddingMonth: string;
  weddingYear: string;
  createdAt: string;
  visits: number;
  rsvpCount: number;
  confirmed: number;
  companions: number;
}

interface StorageRow {
  token: string;
  images: number;
  audioBytes: number;
  totalMB: number;
}

const MetricsTab = memo(function MetricsTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<InvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageRows, setStorageRows] = useState<StorageRow[]>([]);
  const [calcStorage, setCalcStorage] = useState(false);

  const load = useCallback(async () => {
    try {
      const invSnap = await getDocs(INVITATIONS_COLLECTION_REF);
      const list: InvRow[] = [];
      for (const d of invSnap.docs) {
        const data = d.data();
        const token = d.id;
        const rsvpSnap = await getDocs(rsvpByInviteRef(token));
        let rsvpCount = 0;
        let confirmed = 0;
        let companions = 0;
        for (const r of rsvpSnap.docs) {
          const rd = r.data();
          if (rd.inviteToken === token) {
            rsvpCount++;
            if (rd.attendance === "yes") confirmed++;
            companions += Number(rd.companionCount) || 0;
          }
        }
        list.push({
          id: token,
          firstName: String(data.firstName || ""),
          secondName: String(data.secondName || ""),
          adminUsername: String(data.adminUsername || ""),
          weddingDay: String(data.weddingDay || ""),
          weddingMonth: String(data.weddingMonth || ""),
          weddingYear: String(data.weddingYear || ""),
          createdAt: String(data.createdAt || ""),
          visits: Number(data._visits) || 0,
          rsvpCount,
          confirmed,
          companions,
        });
      }
      setRows(list);
      setError("");
    } catch {
      setError(t("errors.dataLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Resumen global ──
  const totals = useMemo(() => {
    const visits = rows.reduce((a, r) => a + r.visits, 0);
    const rsvp = rows.reduce((a, r) => a + r.rsvpCount, 0);
    const confirmed = rows.reduce((a, r) => a + r.confirmed, 0);
    const companions = rows.reduce((a, r) => a + r.companions, 0);
    const declined = rsvp - confirmed;
    return { visits, rsvp, confirmed, companions, declined };
  }, [rows]);

  const conversion = totals.visits > 0 ? Math.round((totals.rsvp / totals.visits) * 1000) / 10 : 0;

  // ── Funnel + ranking ──
  const funnel = useMemo(() => {
    return rows
      .map((r) => ({
        ...r,
        weddingDateLabel:
          r.weddingDay && r.weddingMonth && r.weddingYear ? `${r.weddingDay}/${r.weddingMonth}/${r.weddingYear}` : "—",
        conversion: r.visits > 0 ? Math.round((r.rsvpCount / r.visits) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.rsvpCount - a.rsvpCount || b.visits - a.visits);
  }, [rows]);

  const topByVisits = useMemo(() => [...rows].sort((a, b) => b.visits - a.visits).slice(0, 10), [rows]);

  // ── Crecimiento por mes (últimos 12) ──
  const growth = useMemo(() => {
    const months: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }), count: 0 });
    }
    for (const r of rows) {
      if (!r.createdAt) continue;
      const created = new Date(r.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const idx = (created.getFullYear() - now.getFullYear()) * 12 + (created.getMonth() - now.getMonth()) + 11;
      if (idx >= 0 && idx < 12) months[idx]!.count++;
    }
    return months;
  }, [rows]);

  // ── Almacenamiento bajo demanda (las imágenes/audio viven en Firestore
  // como base64 cifrado en las subcolecciones gallery/audio) ──
  const calculateStorage = useCallback(async () => {
    setCalcStorage(true);
    setError("");
    const out: StorageRow[] = [];
    try {
      for (const r of rows) {
        let images = 0;
        let audioBytes = 0;
        try {
          const g = await getDocs(collection(db, "invitations", r.id, "gallery"));
          images = g.size;
        } catch {}
        try {
          const a = await getDocs(collection(db, "invitations", r.id, "audio"));
          // Cada chunk de audio lleva su `data` (base64 cifrado): se estima el
          // tamaño real como ~75% de la longitud base64 (3 bytes → 4 chars).
          audioBytes = a.docs.reduce((acc, d) => {
            const data = String(d.data().data || "");
            return acc + Math.round(data.length * 0.75);
          }, 0);
        } catch {}
        if (images > 0 || audioBytes > 0) {
          out.push({ token: r.id, images, audioBytes, totalMB: Math.round((audioBytes / 1024 / 1024) * 100) / 100 });
        }
      }
      out.sort((a, b) => b.totalMB - a.totalMB || b.images - a.images);
      setStorageRows(out);
    } catch {
      setError(t("superadmin.metrics.storageError"));
    }
    setCalcStorage(false);
  }, [rows, t]);

  // ── Orígenes de los invitados (coche compartido) — diferencial ──
  const [originStats, setOriginStats] = useState<Array<{ origin: string; count: number }>>([]);
  const [originLoading, setOriginLoading] = useState(false);
  const calculateOrigins = useCallback(async () => {
    setOriginLoading(true);
    const counts = new Map<string, number>();
    try {
      for (const r of rows) {
        try {
          const snap = await getDocs(collection(db, "invitations", r.id, "rides"));
          for (const d of snap.docs) {
            const origin = String(d.data().origin || "").trim();
            if (origin) counts.set(origin, (counts.get(origin) || 0) + 1);
          }
        } catch {}
      }
      setOriginStats([...counts.entries()].map(([origin, count]) => ({ origin, count })).sort((a, b) => b.count - a.count));
    } catch {
      setError(t("superadmin.metrics.storageError"));
    }
    setOriginLoading(false);
  }, [rows, t]);

  // ── Export Excel global ──
  const exportExcel = useCallback(async () => {
    const { exportToXlsx } = await import("../../lib/excel-utils");
    const { buildMetricsSheet } = await import("../../lib/excel-builders");
    exportToXlsx(`metricas_${new Date().toISOString().slice(0, 10)}`, [buildMetricsSheet(funnel)]);
  }, [funnel]);

  // ── Export Excel de invitados (todas las confirmaciones) ──
  const exportGuestsExcel = useCallback(async () => {
    const { exportToXlsx } = await import("../../lib/excel-utils");
    const { buildGlobalGuestsSheet } = await import("../../lib/excel-builders");
    const perInvite: Array<{ invite: { id: string; firstName: string; secondName: string }; rsvps: Array<Record<string, unknown>> }> = [];
    for (const r of rows) {
      try {
        const rsvpSnap = await getDocs(rsvpByInviteRef(r.id));
        perInvite.push({ invite: r, rsvps: rsvpSnap.docs.map((d) => d.data() as Record<string, unknown>) });
      } catch {}
    }
    exportToXlsx(`invitados_${new Date().toISOString().slice(0, 10)}`, [buildGlobalGuestsSheet(perInvite)]);
  }, [rows]);

  // ── Analítica de funciones sociales (uso global) ──
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialStats, setSocialStats] = useState<
    Array<{ token: string; reactions: number; notes: number; songs: number; rides: number; gifts: number }>
  >([]);
  const calculateSocial = useCallback(async () => {
    setSocialLoading(true);
    setError("");
    const out: Array<{ token: string; reactions: number; notes: number; songs: number; rides: number; gifts: number }> = [];
    try {
      for (const r of rows) {
        const counts = { reactions: 0, notes: 0, songs: 0, rides: 0, gifts: 0 };
        for (const sub of ["reactions", "notes", "songs", "rides", "gifts"] as const) {
          try {
            const snap = await getDocs(collection(db, "invitations", r.id, sub));
            counts[sub] = snap.size;
          } catch {}
        }
        if (counts.reactions + counts.notes + counts.songs + counts.rides + counts.gifts > 0) {
          out.push({ token: r.id, ...counts });
        }
      }
      out.sort(
        (a, b) =>
          b.reactions + b.notes + b.songs + b.rides + b.gifts -
          (a.reactions + a.notes + a.songs + a.rides + a.gifts),
      );
      setSocialStats(out);
    } catch {
      setError(t("superadmin.metrics.storageError"));
    }
    setSocialLoading(false);
  }, [rows, t]);

  // Etiqueta de fecha de boda ya integrada en `funnel` (campo weddingDateLabel).
  if (loading) {
    return (
      <p className="setup-subtitle" style={{ textAlign: "center" }}>
        {t("superadmin.dashboardLoading")}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="setup-background-panel">
        <p className="setup-help">{t("superadmin.dashboardEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0, gap: "0.75rem" }}>
      {error ? <p className="setup-error">{error}</p> : null}

      {/* ── Resumen global ── */}
      <div className="support-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
        {[
          { label: t("superadmin.metrics.invitations"), value: rows.length },
          { label: t("superadmin.metrics.visits"), value: totals.visits },
          { label: t("superadmin.metrics.rsvps"), value: totals.rsvp },
          { label: t("superadmin.metrics.confirmed"), value: totals.confirmed },
          { label: t("superadmin.metrics.declined"), value: totals.declined },
          { label: t("superadmin.metrics.companions"), value: totals.companions },
          { label: t("superadmin.metrics.conversion"), value: `${conversion}%` },
        ].map((s) => (
          <div key={s.label} className="setup-background-panel" style={{ textAlign: "center", padding: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "var(--setup-title)" }}>{s.value}</p>
            <p className="setup-help" style={{ margin: 0, fontSize: "0.75rem" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Crecimiento mensual ── */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("superadmin.metrics.growthTitle")}</p>
        <div className="admin-flex admin-gap-sm" style={{ flexWrap: "wrap", gap: "0.5rem 0" }}>
          {growth.map((m) => (
            <div key={m.label} style={{ flex: "1 1 0", minWidth: "52px", textAlign: "center" }}>
              <div style={{ height: `${Math.max(4, m.count * 14)}px`, background: "var(--setup-accent)", borderRadius: "0.25rem", opacity: m.count ? 1 : 0.25 }} />
              <p className="setup-help" style={{ margin: "0.2rem 0 0", fontSize: "0.62rem" }}>
                {m.label} · {m.count}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Almacenamiento (bajo demanda) ── */}
      <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="setup-button setup-button--compact" onClick={() => void calculateStorage()} disabled={calcStorage}>
          {calcStorage ? t("common.loading") : t("superadmin.metrics.storageBtn")}
        </button>
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void exportExcel()}>
          {t("superadmin.metrics.excelBtn")}
        </button>
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void exportGuestsExcel()}>
          {t("superadmin.metrics.guestsExcelBtn")}
        </button>
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void calculateSocial()} disabled={socialLoading}>
          {socialLoading ? t("common.loading") : t("superadmin.metrics.socialBtn")}
        </button>
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void calculateOrigins()} disabled={originLoading}>
          {originLoading ? t("common.loading") : t("superadmin.metrics.originsBtn")}
        </button>
      </div>
      {storageRows.length > 0 ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("superadmin.metrics.token")}</th>
                <th>{t("superadmin.metrics.images")}</th>
                <th>{t("superadmin.metrics.audioMb")}</th>
              </tr>
            </thead>
            <tbody>
              {storageRows.map((s) => (
                <tr key={s.token}>
                  <td className="admin-text-mono" style={{ fontSize: "0.78rem" }}>{s.token}</td>
                  <td>{s.images}</td>
                  <td>{s.totalMB} MB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ── Uso de funciones sociales ── */}
      {socialStats.length > 0 ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("superadmin.metrics.token")}</th>
                <th>{t("superadmin.metrics.socialReactions")}</th>
                <th>{t("superadmin.metrics.socialNotes")}</th>
                <th>{t("superadmin.metrics.socialSongs")}</th>
                <th>{t("superadmin.metrics.socialRides")}</th>
                <th>{t("superadmin.metrics.socialGifts")}</th>
              </tr>
            </thead>
            <tbody>
              {socialStats.map((s) => (
                <tr key={s.token}>
                  <td className="admin-text-mono" style={{ fontSize: "0.78rem" }}>{s.token}</td>
                  <td>{s.reactions}</td>
                  <td>{s.notes}</td>
                  <td>{s.songs}</td>
                  <td>{s.rides}</td>
                  <td>{s.gifts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ── Orígenes de los invitados ── */}
      {originStats.length > 0 ? (
        <div className="setup-background-panel">
          <p className="setup-label">{t("superadmin.metrics.originsTitle")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {originStats.slice(0, 30).map((o) => (
              <span key={o.origin} style={{ fontSize: "0.78rem", border: "1px solid var(--setup-border)", borderRadius: "999px", padding: "0.15rem 0.6rem", color: "var(--setup-subtitle)" }}>
                {o.origin} · {o.count}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Ranking por visitas ── */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("superadmin.metrics.topVisitsTitle")}</p>
        <ol style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--setup-subtitle)" }}>
          {topByVisits.slice(0, 10).map((r) => (
            <li key={r.id} style={{ marginBottom: "0.2rem" }}>
              <code>{r.id}</code> — {r.firstName ? `${r.firstName} & ${r.secondName}` : t("superadmin.data.emptyInvitation")} · {r.visits} {t("superadmin.visitsWord")}
            </li>
          ))}
        </ol>
      </div>

      {/* ── Funnel por invitación ── */}
      <div className="admin-table-wrapper" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("superadmin.metrics.token")}</th>
              <th>{t("superadmin.metrics.wedding")}</th>
              <th>{t("superadmin.metrics.date")}</th>
              <th>{t("superadmin.metrics.visits")}</th>
              <th>{t("superadmin.metrics.rsvps")}</th>
              <th>{t("superadmin.metrics.confirmed")}</th>
              <th>{t("superadmin.metrics.conversion")}</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((r) => (
              <tr key={r.id}>
                <td className="admin-text-mono" style={{ fontSize: "0.75rem" }}>{r.id}</td>
                <td>{r.firstName ? `${r.firstName} & ${r.secondName}` : t("superadmin.data.emptyInvitation")}</td>
                <td>{r.weddingDateLabel}</td>
                <td>{r.visits}</td>
                <td>{r.rsvpCount}</td>
                <td>{r.confirmed}</td>
                <td>{r.conversion}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default MetricsTab;
