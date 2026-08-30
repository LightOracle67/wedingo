import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { setDoc, getDoc, doc, collection, getDocs, query, orderBy, limit, documentId } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";
import { db, invitationDocRef, rsvpByInviteRef } from "../../lib/firebase";
import { encrypt } from "../../lib/crypto-utils";
import {
  buildAttendancePrediction,
  buildConfirmationsPerDay,
  calcRSVPSummary,
  getDietarySummary,
} from "../../lib/admin-utils";
import { DonutChart, Legend } from "../../components/AttendanceChart";
import StatsCard from "./StatsCard";
import type { InvitationConfig } from "../../types";
import { useConfirm } from "../../contexts/ConfirmContext";

export interface PanelTabConfig {
  inviteToken: string;
  confirmedResponses: number;
  declinedResponses: number;
  totalGuests: number;
  /** Personas que confirman (1 + acompañantes por respuesta "yes"). */
  confirmedPeople: number;
  /** Personas que declinan (1 + acompañantes por respuesta "no"). */
  declinedPeople: number;
  /** Nº de invitados esperados configurado (0..1000; 0 = sin definir). */
  expectedGuests: number;
  rsvpEntries: Array<{ id: string; guestName: string; attendance: string; companions: number; submittedAt: unknown }>;
  formatDate: (date: unknown) => string;
  onRestore?: () => Promise<void>;
  visitCount: number;
  /** Timestamp (ms) de la fecha de la boda; null si no está configurada. */
  weddingTimestamp?: number | null;
  exportData?: InvitationConfig;
}

interface DietaryItem {
  item: string;
  count: number;
}

const PanelTab = memo(function PanelTab({ config }: { config: PanelTabConfig }) {
  const {
    inviteToken,
    confirmedResponses,
    declinedResponses,
    totalGuests,
    confirmedPeople,
    declinedPeople,
    expectedGuests,
    rsvpEntries,
    formatDate,
    onRestore,
    visitCount,
    weddingTimestamp,
    exportData,
  } = config;
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const inviteUrl = `${window.location.origin}/${inviteToken}`;
  const restoreRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => calcRSVPSummary(rsvpEntries), [rsvpEntries]);
  const dietary = useMemo(() => getDietarySummary(rsvpEntries).slice(0, 5), [rsvpEntries]);

  // Proyección de asistencia (F6): estimación del total final, % de aforo y
  // tendencia a partir del ritmo real de confirmaciones.
  const prediction = useMemo(
    () => buildAttendancePrediction(rsvpEntries, expectedGuests, weddingTimestamp ?? null, Date.now()),
    [rsvpEntries, expectedGuests, weddingTimestamp],
  );

  // Serie de confirmaciones por día (últimos 14 días) para el mini-gráfico.
  const confirmationsPerDay = useMemo(() => buildConfirmationsPerDay(rsvpEntries, 14, Date.now()), [rsvpEntries]);
  const hasConfirmationsActivity = confirmationsPerDay.some((d) => d.count > 0);

  // Historial de visitas por día (F18): últimos 7 días ordenados por fecha.
  // La lectura falla silenciosamente si no hay subcolección (invitación
  // antigua): el bloque simplemente no se muestra.
  const [lastVisits, setLastVisits] = useState<Array<{ day: string; count: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, "invitations", inviteToken, "visitLog"),
          orderBy(documentId(), "desc"),
          limit(7),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const items = snap.docs
          .map((d) => ({ day: d.id, count: Number(d.data().count) || 0 }))
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
          .sort((a, b) => a.day.localeCompare(b.day));
        setLastVisits(items);
      } catch {
        /* el historial es opcional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  // Estadísticas: si hay invitados esperados configurados (>0) se calculan en
  // PERSONAS a partir de ese número (total = esperado, sin responder =
  // esperado − confirmados). Sin configuración se mantiene el comportamiento
  // anterior (resumen de familias por respuestas RSVP).
  const useExpected = expectedGuests > 0;
  const confirmed = useExpected ? confirmedPeople : confirmedResponses;
  const declined = useExpected ? declinedPeople : declinedResponses;
  const pending = useExpected ? Math.max(0, expectedGuests - confirmedPeople) : summary.pending;
  const total = useExpected ? expectedGuests : totalGuests;

  const handleBackup = useCallback(async () => {
    try {
      if (!exportData) throw new Error("No data to export");

      const { bankInfo, ...safeData } = exportData;
      // Backup completo: además de la config, se exportan las subcolecciones
      // CIFRADAS (galería, audio, imágenes de config y respuestas RSVP) tal y
      // como están en Firestore, para poder restaurarlas sin re-cifrar.
      const [galSnap, audioSnap, cfgSnap, rsvpSnap, visitSnap] = await Promise.all([
        getDocs(collection(db, "invitations", inviteToken, "gallery")),
        getDocs(collection(db, "invitations", inviteToken, "audio")),
        getDocs(collection(db, "invitations", inviteToken, "configImages")),
        getDocs(rsvpByInviteRef(inviteToken)),
        // Historial de visitas por día (F18): se incluye en la copia.
        getDocs(collection(db, "invitations", inviteToken, "visitLog")).catch(() => ({
          docs: [] as Array<{ id: string; data: () => Record<string, unknown> }>,
        })),
      ]);
      const readDocs = (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const payload = {
        _wedingoBackupVersion: 1,
        config: { ...safeData, bankInfo: bankInfo || "" },
        gallery: readDocs(galSnap),
        audio: readDocs(audioSnap),
        configImages: readDocs(cfgSnap),
        rsvp: readDocs(rsvpSnap),
        visitLog: readDocs(visitSnap),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast("error", `${t("errors.backupFailed")} ${t("errors.errorDetail", { error: msg })}`);
    }
  }, [exportData, inviteToken, t, addToast]);

  const handleRestore = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        e.target.value = "";
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        // Validación estricta: un backup es un objeto plano de config (no un
        // array ni el formato del export del superadmin, que corrompería el
        // documento con claves anidadas).
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid backup file");
        // Formato v1 (completo): { config, gallery, audio, configImages, rsvp }.
        const configPart = data._wedingoBackupVersion === 1 ? (data as { config?: unknown }).config : data;
        const cfg = configPart as Record<string, unknown>;
        if (typeof cfg.firstName !== "string" || typeof cfg.secondName !== "string") {
          throw new Error("Invalid backup file");
        }
        if (!(await confirm({ message: t("panel.restoreConfirm"), danger: true }))) {
          e.target.value = "";
          return;
        }

        const { bankInfo, ...rest } = cfg;
        // Las imágenes y el audio viajan como data URLs descifradas en el
        // backup: volcarlas al documento superaba el límite de 1 MiB (y dejaba
        // datos en claro). Se omiten en el merge (se conservan las actuales);
        // el admin puede re-subirlas si las perdió.
        const mediaKeys = ["couplePhoto", "backgroundImage", "customSeal", "cornerDecoration", "musicFile"];
        const toSave: Record<string, unknown> = { ...rest, bankInfo: "" };
        for (const key of mediaKeys) {
          const v = toSave[key];
          if (typeof v === "string" && v.startsWith("data:")) delete toSave[key];
        }
        if (bankInfo && bankInfo !== "[REDACTED]") {
          toSave.bankInfo = await encrypt(String(bankInfo), inviteToken);
        }

        await setDoc(invitationDocRef(inviteToken), toSave, { merge: true });

        // Se restauran las subcolecciones si el backup las incluye (formato
        // _wedingoBackupVersion 1): galería, audio, imágenes de config y
        // respuestas RSVP, tal y como se exportaron (ya cifradas).
        const sub = data as {
          gallery?: Array<{ id: string; [k: string]: unknown }>;
          audio?: Array<{ id: string; [k: string]: unknown }>;
          configImages?: Array<{ id: string; [k: string]: unknown }>;
          rsvp?: Array<{ id: string; [k: string]: unknown }>;
          visitLog?: Array<{ id: string; [k: string]: unknown }>;
        };
        const writeSub = async (path: string, docs: Array<{ id: string; [k: string]: unknown }> | undefined) => {
          if (!docs || !docs.length) return;
          for (const d of docs) {
            const { id: _id, ...restDoc } = d;
            await setDoc(doc(db, "invitations", inviteToken, path, _id), restDoc);
          }
        };
        // Los Timestamps de Firestore se serializan en el backup como
        // { seconds, nanoseconds } y la regla exige `is timestamp`: se
        // reconstruyen como Date (setDoc los convierte a Timestamp).
        const reviveTimestamp = (value: unknown): unknown => {
          if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            typeof (value as { seconds?: unknown }).seconds === "number" &&
            typeof (value as { nanoseconds?: unknown }).nanoseconds === "number"
          ) {
            const { seconds, nanoseconds } = value as { seconds: number; nanoseconds: number };
            return new Date(seconds * 1000 + Math.round(nanoseconds / 1e6));
          }
          if (Array.isArray(value)) return value.map(reviveTimestamp);
          if (value && typeof value === "object") {
            return Object.fromEntries(
              Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, reviveTimestamp(v)]),
            );
          }
          return value;
        };
        const writeSubRsvp = async (docs: Array<{ id: string; [k: string]: unknown }> | undefined) => {
          if (!docs || !docs.length) return;
          for (const d of docs) {
            const { id: _id, ...restDoc } = d;
            await setDoc(doc(db, "rsvpResponses", inviteToken, "responses", _id), reviveTimestamp(restDoc));
          }
        };
        await writeSub("gallery", sub.gallery);
        await writeSub("audio", sub.audio);
        await writeSub("configImages", sub.configImages);
        await writeSubRsvp(sub.rsvp);
        // El historial de visitas es incremental por día: se restaura solo si
        // el documento de ese día no existe todavía (nunca se sobrescribe).
        if (sub.visitLog?.length) {
          for (const d of sub.visitLog) {
            const dayRef = doc(db, "invitations", inviteToken, "visitLog", d.id);
            const existing = await getDoc(dayRef);
            if (!existing.exists()) {
              const { id: _id, ...restDoc } = d;
              await setDoc(dayRef, { count: Number(restDoc.count) || 0 });
            }
          }
        }

        if (onRestore) await onRestore();
        addToast("success", t("panel.restoreSuccess"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addToast("error", `${t("errors.restoreFailed")} ${t("errors.errorDetail", { error: msg })}`);
      }
      e.target.value = "";
    },
    [inviteToken, onRestore, t, addToast, confirm],
  );

  return (
    <>
      <div className="admin-stats-grid">
        <StatsCard label={t("panel.confirmed")} value={confirmed} />
        <StatsCard label={t("panel.notAttending")} value={declined} />
        <StatsCard label={t("panel.noResponse")} value={pending} />
        <StatsCard label={t("panel.totalGuests")} value={total} />
      </div>

      <div className="setup-help" style={{ marginBottom: "0.5rem", fontSize: "0.8rem", textAlign: "center" }}>
        {visitCount > 0 ? `👁 ${t("panel.visits", { count: visitCount })}` : t("panel.noVisits")}
      </div>

      {/* ── Proyección de asistencia (F6) ── */}
      {prediction.projected > 0 ? (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.9rem 1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.4rem" }}>
            {t("panel.predictionTitle")}
          </p>
          <div className="panel-prediction">
            <div className="panel-prediction__main">
              <span className="panel-prediction__big">{prediction.projected}</span>
              <span className="panel-prediction__tag">{t("panel.predictedPeople")}</span>
            </div>
            {prediction.capacityPct !== null ? (
              <div className="panel-prediction__metric">
                <span className="panel-prediction__value">{prediction.capacityPct}%</span>
                <span className="panel-prediction__label">{t("panel.predictedCapacity")}</span>
              </div>
            ) : null}
            <div className="panel-prediction__metric">
              <span className="panel-prediction__value">{prediction.pacePerDay}</span>
              <span className="panel-prediction__label">{t("panel.predictedPace")}</span>
            </div>
            <div className="panel-prediction__metric">
              <span className="panel-prediction__value">
                {prediction.trend === "up" ? "↗" : prediction.trend === "down" ? "↘" : "→"}
              </span>
              <span className="panel-prediction__label">
                {t(
                  prediction.trend === "up"
                    ? "panel.trendUp"
                    : prediction.trend === "down"
                      ? "panel.trendDown"
                      : "panel.trendFlat",
                )}
              </span>
            </div>
          </div>
          {prediction.capacityPct !== null ? (
            // Barra de progreso de aforo: visual y accesible (aria attrs).
            <div
              className="panel-capacity-bar"
              role="progressbar"
              aria-valuenow={prediction.capacityPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("panel.predictedCapacity")}
              style={{ marginTop: "0.7rem" }}
            >
              <div
                style={{
                  width: `${Math.min(100, prediction.capacityPct)}%`,
                  height: "0.55rem",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg, var(--setup-accent), color-mix(in srgb, var(--setup-accent) 55%, #fff))",
                  transition: "width 400ms ease",
                }}
              />
            </div>
          ) : null}
          {prediction.hasFutureWedding ? (
            <p className="setup-help" style={{ marginTop: "0.4rem", fontSize: "0.75rem" }}>
              {t("panel.predictionHint", { days: prediction.daysToWedding })}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── Confirmaciones por día (mini-gráfico, 14 días) ── */}
      {hasConfirmationsActivity ? (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.9rem 1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.4rem" }}>
            {t("panel.confirmsPerDay")}
          </p>
          <div className="visits-bars" aria-label={t("panel.confirmsPerDay")}>
            {/* Máximo calculado fuera del map (v2.185): era O(n²) por render. */}
            {(() => {
              const max = Math.max(1, ...confirmationsPerDay.map((x) => x.count));
              return confirmationsPerDay.map((d) => {
                return (
                <div key={d.day} className="visits-bars__col" title={`${d.day}: ${d.count}`}>
                  <div className="visits-bars__bar" style={{ height: `${Math.max(8, (d.count / max) * 100)}%` }} />
                  <span className="visits-bars__label">{d.day}</span>
                  <span className="visits-bars__count">{d.count}</span>
                </div>
                );
              });
            })()}
          </div>
        </div>
      ) : null}

      {/* ── Historial de visitas por día (F18) ── */}
      {lastVisits.length > 0 ? (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.9rem 1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.4rem" }}>
            {t("panel.visitsHistory")}
          </p>
          <div className="visits-bars" aria-label={t("panel.visitsHistory")}>
            {/* Máximo calculado fuera del map (v2.185): era O(n²) por render. */}
            {(() => {
              const max = Math.max(1, ...lastVisits.map((x: { count: number }) => x.count));
              return lastVisits.map((d: { day: string; count: number }) => {
              const short = d.day.slice(5); // MM-DD
              return (
                <div key={d.day} className="visits-bars__col" title={`${short}: ${d.count}`}>
                  <div className="visits-bars__bar" style={{ height: `${Math.max(8, (d.count / max) * 100)}%` }} />
                  <span className="visits-bars__label">{short}</span>
                  <span className="visits-bars__count">{d.count}</span>
                </div>
              );
              });
            })()}
          </div>
        </div>
      ) : null}

      {confirmed + declined > 0 && (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "1rem", textAlign: "center" }}>
          <DonutChart yes={confirmed} no={declined} pending={pending} size={120} />
          <Legend
            items={[
              { label: t("panel.confirms"), value: confirmed, color: "var(--accent, #22c55e)" },
              { label: t("panel.declines"), value: declined, color: "#ef4444" },
              { label: t("panel.pending"), value: pending, color: "#f59e0b" },
            ]}
          />
        </div>
      )}

      {dietary.length > 0 && (
        <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.3rem", fontSize: "0.8rem" }}>
            {t("panel.dietaryPreferences")}
          </p>
          {dietary.map((d: DietaryItem) => (
            <div
              key={d.item}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                padding: "0.15rem 0",
                borderBottom: "1px solid var(--setup-border)",
              }}
            >
              <span style={{ textTransform: "capitalize" }}>{d.item}</span>
              <span style={{ fontWeight: 600 }}>{d.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>{t("panel.publishedAt")}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--setup-accent)", fontSize: "0.9rem", wordBreak: "break-all" }}
          >
            {inviteUrl}
          </a>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          <a className="setup-button setup-button--compact" href={inviteUrl} target="_blank" rel="noreferrer">
            {t("panel.viewInvitation")}
          </a>
          <button
            type="button"
            className="setup-button setup-button--ghost setup-button--compact"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(inviteUrl);
                addToast("success", t("panel.linkCopied"));
              } catch {
                addToast("error", t("errors.clipboardCopyFailed"));
              }
            }}
          >
            {t("panel.copyLink")}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleBackup}>
          {t("panel.downloadBackup")}
        </button>
        <button
          className="setup-button setup-button--ghost setup-button--compact"
          type="button"
          onClick={() => restoreRef.current?.click()}
        >
          {t("panel.restoreBackup")}
        </button>
        <input ref={restoreRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleRestore} />
      </div>

      {rsvpEntries && rsvpEntries.length > 0 ? (
        <div className="admin-recent-section" style={{ marginTop: "1rem" }}>
          <p className="setup-label setup-label--tight">{t("panel.latestResponses")}</p>
          {(rsvpEntries || [])
            .slice(0, 5)
            .map(
              (entry: {
                id: string;
                guestName: string;
                attendance: string;
                companions: number;
                submittedAt: unknown;
              }) => (
                <div key={entry.id} className="admin-recent-row">
                  <span className="admin-recent-row__name">{entry.guestName}</span>
                  <span className={`admin-recent-row__status admin-recent-row__status--${entry.attendance}`}>
                    {entry.attendance === "yes"
                      ? t("panel.withCompanions", { count: entry.companions })
                      : t("panel.notAttends")}
                  </span>
                  <span className="admin-recent-row__date">{formatDate(entry.submittedAt)}</span>
                </div>
              ),
            )}
        </div>
      ) : (
        <p className="setup-help">{t("panel.noResponses")}</p>
      )}
    </>
  );
});

export default PanelTab;
