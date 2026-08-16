import { memo, useCallback, useMemo, useRef, type ChangeEvent } from "react";
import { setDoc, doc, collection, getDocs } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";
import { db, invitationDocRef, rsvpByInviteRef } from "../../lib/firebase";
import { encrypt } from "../../lib/crypto-utils";
import { calcRSVPSummary, getDietarySummary } from "../../lib/admin-utils";
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
    exportData,
  } = config;
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const inviteUrl = `${window.location.origin}/${inviteToken}`;
  const restoreRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => calcRSVPSummary(rsvpEntries), [rsvpEntries]);
  const dietary = useMemo(() => getDietarySummary(rsvpEntries).slice(0, 5), [rsvpEntries]);

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
      const [galSnap, audioSnap, cfgSnap, rsvpSnap] = await Promise.all([
        getDocs(collection(db, "invitations", inviteToken, "gallery")),
        getDocs(collection(db, "invitations", inviteToken, "audio")),
        getDocs(collection(db, "invitations", inviteToken, "configImages")),
        getDocs(rsvpByInviteRef(inviteToken)),
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
            return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, reviveTimestamp(v)]));
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
        <div style={{ marginTop: "0.5rem" }}>
          <a className="setup-button setup-button--compact" href={inviteUrl} target="_blank" rel="noreferrer">
            {t("panel.viewInvitation")}
          </a>
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
