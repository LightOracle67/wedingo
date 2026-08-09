import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useToast } from "../../hooks/useToast";
import Modal from "../../components/Modal";
import { downloadJson } from "../../lib/file-utils";

interface DetailModalProps {
  token: string;
  onClose: () => void;
}

const SOCIAL_SUBS = ["notes", "songs", "rides", "gifts", "reactions"];

/**
 * InvitationDetailModal — Vista de detalle de una invitación para el
 * superadmin: lista de confirmaciones, muro social con moderación (borrar
 * aportaciones), galería, auditoría de config (configLog), tamaño de medios,
 * export social, reset de confirmaciones e importación CSV.
 */
const InvitationDetailModal = memo(function InvitationDetailModal({ token, onClose }: DetailModalProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [rsvps, setRsvps] = useState<Array<Record<string, unknown>>>([]);
  const [social, setSocial] = useState<Record<string, Array<{ id: string; preview: string }>>>({});
  const [gallery, setGallery] = useState<Array<{ id: string; desc: string }>>([]);
  const [configLog, setConfigLog] = useState<Array<{ fields: string; ts: number }>>([]);
  const [mediaBytes, setMediaBytes] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rsvpSnap, galSnap, logSnap] = await Promise.all([
        getDocs(collection(db, "rsvpResponses", token, "responses")),
        getDocs(collection(db, "invitations", token, "gallery")),
        getDocs(collection(db, "invitations", token, "configLog")),
      ]);
      setRsvps(rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setGallery(
        galSnap.docs.map((d) => ({ id: d.id, desc: String(d.data().description || "") })),
      );
      setMediaBytes(galSnap.docs.reduce((acc, d) => acc + (String(d.data().data || "").length * 3) / 4, 0));
      setConfigLog(
        logSnap.docs.map((d) => {
          const data = d.data();
          const raw = data.ts as { seconds?: number } | null | undefined;
          const ts = raw && typeof raw === "object" && "seconds" in raw ? Number(raw.seconds) * 1000 : 0;
          return { fields: String(data.fields || ""), ts };
        }),
      );
      // Aportaciones sociales (preview corto).
      const soc: Record<string, Array<{ id: string; preview: string }>> = {};
      for (const sub of SOCIAL_SUBS) {
        const snap = await getDocs(collection(db, "invitations", token, sub));
        soc[sub] = snap.docs.map((d) => {
          const data = d.data();
          const text = String(data.message || data.song || data.origin || data.guestName || data.reservedBy || "");
          return { id: d.id, preview: text.slice(0, 80) };
        });
      }
      setSocial(soc);
    } catch {
      addToast("error", t("errors.dataLoadFailed"));
    }
  }, [token, addToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteSocialDoc = useCallback(
    async (sub: string, id: string) => {
      if (!window.confirm(t("manage.detailDeleteSocial"))) return;
      try {
        await deleteDoc(doc(db, "invitations", token, sub, id));
        setSocial((prev) => ({ ...prev, [sub]: (prev[sub] || []).filter((s) => s.id !== id) }));
        addToast("success", t("manage.detailDeleted"));
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [token, addToast, t],
  );

  const resetRsvps = useCallback(async () => {
    if (!window.confirm(t("manage.detailResetConfirm"))) return;
    setBusy(true);
    try {
      const snap = await getDocs(collection(db, "rsvpResponses", token, "responses"));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "rsvpResponses", token));
      await batch.commit();
      addToast("success", t("manage.detailResetDone"));
      void load();
    } catch {
      addToast("error", t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }, [token, load, addToast, t]);

  const exportSocial = useCallback(() => {
    const out: Record<string, Array<{ id: string; preview: string }>> = {};
    for (const [sub, items] of Object.entries(social)) if (items.length) out[sub] = items;
    downloadJson(`${token}_social.json`, out);
  }, [token, social]);

  const importCsv = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) throw new Error();
        const batch = writeBatch(db);
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i]!.split(",");
          const name = (cols[0] || "").trim();
          const attendance = (cols[1] || "").trim() === "no" ? "no" : "yes";
          if (!name) continue;
          const now = new Date();
          batch.set(doc(collection(db, "rsvpResponses", token, "responses")), {
            rsvpType: "main",
            guestName: name.slice(0, 120),
            attendance,
            inviteToken: token,
            submittedAt: now,
            privacyConsent: true,
            privacyConsentAt: now,
            companions: 0,
            companionCount: 0,
            companionNames: [],
            companionMenus: [],
            companionAllergies: [],
            companionAllergiesOther: [],
            allergiesOther: "",
            mealChoice: "",
            dietaryInfo: "",
            guestNames: name.slice(0, 120),
            attendees: [],
            userAgent: `${navigator.userAgent.slice(0, 160)} [import]`,
          });
          count++;
          if (count === 400) break;
        }
        await batch.commit();
        addToast("success", t("manage.detailImported", { count }));
        void load();
      } catch {
        addToast("error", t("manage.restoreInvalidJson"));
      }
    },
    [token, load, addToast, t],
  );

  const menuCounts: Record<string, number> = {};
  for (const r of rsvps) {
    const m = String(r.mealChoice || "");
    if (m) menuCounts[m] = (menuCounts[m] || 0) + 1;
  }

  return (
    <Modal title={`${t("manage.detailTitle")} — ${token}`} closeLabel={t("common.close")} onClose={onClose} style={{ width: 680, maxWidth: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", maxHeight: "70vh", overflowY: "auto", paddingRight: "0.25rem" }}>
        {/* Confirmaciones + menús */}
        <section>
          <p className="setup-label">
            {t("manage.detailRsvps", { count: rsvps.length })}
            {Object.keys(menuCounts).length
              ? ` · ${Object.entries(menuCounts).map(([k, v]) => `${k}: ${v}`).join(" · ")}`
              : ""}
          </p>
          <div style={{ maxHeight: "10rem", overflowY: "auto", border: "1px solid var(--setup-border)", borderRadius: "0.5rem" }}>
            {rsvps.map((r) => (
              <div key={String(r.id)} style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)" }}>
                {String(r.guestName || "")} — {String(r.attendance || "")} · {Number(r.companionCount) || 0} acc.
              </div>
            ))}
            {rsvps.length === 0 ? <p className="setup-help" style={{ padding: "0.5rem" }}>{t("manage.detailNoRsvps")}</p> : null}
          </div>
        </section>

        {/* Medios + configLog */}
        <section className="admin-flex" style={{ gap: "1rem", flexWrap: "wrap", justifyContent: "space-between" }}>
          <p className="setup-label" style={{ margin: 0 }}>
            {t("manage.detailMedia", { size: (mediaBytes / 1024).toFixed(1) })}
          </p>
          <p className="setup-label" style={{ margin: 0 }}>
            {t("manage.detailGallery", { count: gallery.length })}
          </p>
        </section>

        {/* Auditoría de cambios */}
        <section>
          <p className="setup-label">{t("manage.detailConfigLog")}</p>
          <div style={{ maxHeight: "8rem", overflowY: "auto", border: "1px solid var(--setup-border)", borderRadius: "0.5rem" }}>
            {configLog.map((c, i) => (
              <div key={i} style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)" }}>
                {c.fields}
                {c.ts ? <span style={{ color: "var(--setup-muted)" }}> · {new Date(c.ts).toLocaleString()}</span> : null}
              </div>
            ))}
            {configLog.length === 0 ? <p className="setup-help" style={{ padding: "0.5rem" }}>{t("manage.detailNoLog")}</p> : null}
          </div>
        </section>

        {/* Muro social con moderación */}
        <section>
          <p className="setup-label">{t("manage.detailSocial")}</p>
          <div style={{ maxHeight: "10rem", overflowY: "auto", border: "1px solid var(--setup-border)", borderRadius: "0.5rem" }}>
            {SOCIAL_SUBS.map((sub) =>
              (social[sub] || []).map((s) => (
                <div key={sub + s.id} className="admin-flex admin-flex--between" style={{ padding: "0.35rem 0.6rem", fontSize: "0.78rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)" }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong>{sub}</strong> · {s.preview}
                  </span>
                  <button type="button" className="setup-button setup-button--compact" style={{ fontSize: "0.7rem", color: "#f6c7c7", background: "transparent" }} onClick={() => deleteSocialDoc(sub, s.id)}>
                    ✕
                  </button>
                </div>
              )),
            )}
            {Object.values(social).every((a) => a.length === 0) ? (
              <p className="setup-help" style={{ padding: "0.5rem" }}>{t("manage.detailNoSocial")}</p>
            ) : null}
          </div>
        </section>

        {/* Acciones */}
        <section className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="setup-button setup-button--compact" type="button" onClick={exportSocial} disabled={busy}>
            {t("manage.detailExportSocial")}
          </button>
          <button className="setup-button setup-button--danger setup-button--compact" type="button" onClick={resetRsvps} disabled={busy}>
            {t("manage.detailReset")}
          </button>
          <label className="setup-button setup-button--ghost setup-button--compact" style={{ cursor: "pointer", margin: 0 }}>
            {t("manage.detailImportCsv")}
            <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => { void importCsv(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </section>
      </div>
    </Modal>
  );
});

export default InvitationDetailModal;
