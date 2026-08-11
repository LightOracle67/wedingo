import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, rsvpByInviteRef } from "../../lib/firebase";
import { useToast } from "../../hooks/useToast";
import { downloadText } from "../../lib/file-utils";

interface ToolsTabProps {
  inviteToken: string;
  inviteUrl: string;
  weddingDate?: { year: string; month: string; day: string; hour?: string; minute?: string };
  weddingPlace?: string;
  coupleName?: string;
}

/** Guarda/lee la marca "última visita" para el badge de confirmaciones nuevas. */
const LAST_SEEN_KEY = "wedin_last_seen_rsvp";

/** Meses en español → número (para el .ics del responsable). */
const MONTH_TO_NUM: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/**
 * ToolsTab — Herramientas del responsable (/token/admin): recordatorio por
 * WhatsApp personalizable, lista de invitados esperados (faltan por confirmar),
 * badge de confirmaciones nuevas, descarga de galería, resumen de menús,
 * plazas restantes, .ics y nota interna. Sin datos de terceros; solo Firestore
 * + cliente (GDPR conforme).
 */
const ToolsTab = memo(function ToolsTab({ inviteToken, inviteUrl, weddingDate, weddingPlace, coupleName }: ToolsTabProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();

  // ── Recordatorio WhatsApp ──
  const [reminder, setReminder] = useState("");

  // ── Lista de invitados esperados ──
  const [expected, setExpected] = useState<string[]>([]);
  const [newGuest, setNewGuest] = useState("");
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  // ── Badge de confirmaciones nuevas ──
  const [newCount, setNewCount] = useState(0);

  // ── Galería ──
  const [galleryCount, setGalleryCount] = useState(0);

  // ── Extras diferenciales: buzón y fotos del día (las mesas y el mapa del
  // recinto viven en la pestaña Distribución) ──
  const [mailbox, setMailbox] = useState<Array<{ id: string; guestName: string; message: string; ts: string }>>([]);
  const [dayPhotoCount, setDayPhotoCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [guestsSnap, rsvpSnap, galSnap, mailboxSnap, daySnap] = await Promise.all([
        getDocs(collection(db, "invitations", inviteToken, "guests")),
        getDocs(rsvpByInviteRef(inviteToken)),
        getDocs(collection(db, "invitations", inviteToken, "gallery")),
        getDocs(collection(db, "invitations", inviteToken, "mailbox")),
        getDocs(collection(db, "invitations", inviteToken, "dayphotos")),
      ]);
      setMailbox(
        mailboxSnap.docs.map((d) => ({
          id: d.id,
          guestName: String(d.data().guestName || ""),
          message: String(d.data().message || ""),
          ts: d.data().createdAt ? new Date(String(d.data().createdAt)).toLocaleString() : "",
        })),
      );
      setDayPhotoCount(daySnap.size || 0);
      setExpected(guestsSnap.docs.map((d) => String(d.data().name || "")));
      const conf = new Set<string>();
      let newest = 0;
      for (const d of rsvpSnap.docs) {
        conf.add(String(d.data().guestName || "").toLowerCase());
        const raw = d.data().submittedAt as { seconds?: number } | undefined;
        if (raw && typeof raw === "object" && "seconds" in raw) newest = Math.max(newest, Number(raw.seconds) * 1000);
      }
      setConfirmed(conf);
      setGalleryCount(galSnap.size || 0);
      // Badge: confirmaciones posteriores a la última visita. Aislado en su
      // propio try: si el almacenamiento local falla, NO aborta la carga.
      try {
        const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
        const recent = rsvpSnap.docs.filter((d) => {
          const raw = d.data().submittedAt as { seconds?: number } | undefined;
          return raw && typeof raw === "object" && "seconds" in raw && Number(raw.seconds) * 1000 > lastSeen;
        }).length;
        setNewCount(recent);
      } catch {}
    } catch {
      /* datos no disponibles */
    }
  }, [inviteToken]);

  useEffect(() => {
    void load();
    return () => {
      // Marca la visita actual al desmontar (badge de confirmaciones nuevas).
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      } catch {}
    };
  }, [load]);

  const missing = useMemo(() => expected.filter((n) => !confirmed.has(n.toLowerCase())), [expected, confirmed]);

  const addGuest = useCallback(async () => {
    const name = newGuest.trim();
    if (!name) return;
    try {
      await setDoc(doc(collection(db, "invitations", inviteToken, "guests")), { name: name.slice(0, 120) });
      setExpected((prev) => [...prev, name.slice(0, 120)]);
      setNewGuest("");
      addToast("success", t("tools.guestAdded"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [newGuest, inviteToken, addToast, t]);

  // ── Buzón privado ──
  const deleteMail = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(collection(db, "invitations", inviteToken, "mailbox"), id));
        setMailbox((prev) => prev.filter((m) => m.id !== id));
        addToast("success", t("tools.mailDeleted"));
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [inviteToken, addToast, t],
  );

  // ── Fotos del día: descarga y borrado ──
  const downloadDayPhotos = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "invitations", inviteToken, "dayphotos"));
      const { decrypt } = await import("../../lib/crypto-utils");
      const urls: string[] = [];
      for (const d of snap.docs) {
        const data = String(d.data().data || "");
        if (!data) continue;
        const url = await decrypt(data, inviteToken);
        if (url) urls.push(url);
      }
      if (urls.length === 0) {
        addToast("info", t("tools.noDayPhotos"));
        return;
      }
      const blob = new Blob([JSON.stringify(urls)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${inviteToken}_fotos_dia.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      addToast("success", t("tools.dayPhotosDownloaded", { count: urls.length }));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [inviteToken, addToast, t]);

  // ── Exportación XLSX (Excel/LibreOffice) de invitados y buzón ──
  const exportGuestsXlsx = useCallback(async () => {
    // Sin invitados esperados no hay nada que exportar.
    if ((expected || []).length === 0) {
      addToast("info", t("tools.noGuestsToExport"));
      return;
    }
    const { exportToXlsx } = await import("../../lib/excel-utils");
    const { buildGuestsSheet } = await import("../../lib/excel-builders");
    const sheet = buildGuestsSheet(expected, confirmed, t);
    exportToXlsx(`invitados_${new Date().toISOString().slice(0, 10)}`, [sheet]);
    addToast("success", t("tools.exportOk", { count: sheet.rows.length }));
  }, [expected, confirmed, t, addToast]);

  const exportMailboxXlsx = useCallback(async () => {
    // Sin mensajes privados no hay buzón que exportar.
    if ((mailbox || []).length === 0) {
      addToast("info", t("tools.noMail"));
      return;
    }
    const { exportToXlsx } = await import("../../lib/excel-utils");
    const { buildMailboxSheet } = await import("../../lib/excel-builders");
    const sheet = buildMailboxSheet(mailbox || [], t);
    exportToXlsx(`buzon_${new Date().toISOString().slice(0, 10)}`, [sheet]);
    addToast("success", t("tools.exportOk", { count: sheet.rows.length }));
  }, [mailbox, t, addToast]);

  const openReminder = useCallback(() => {
    const text = reminder.trim() || `${t("tools.reminderDefault")} ${coupleName || ""}\n\n${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }, [reminder, inviteUrl, coupleName, t]);

  const downloadGallery = useCallback(async () => {
    // Sin fotos en la galería no se descarga nada.
    if (galleryCount === 0) {
      addToast("info", t("tools.noGalleryPhotos"));
      return;
    }
    try {
      const snap = await getDocs(collection(db, "invitations", inviteToken, "gallery"));
      const urls = snap.docs.map((d) => ({ id: d.id, data: String(d.data().data || "") }));
      for (const img of urls) {
        if (!img.data) continue;
        const a = document.createElement("a");
        a.href = img.data;
        a.download = `wedingo-${img.id}.webp`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      addToast("success", t("tools.galleryDownloaded", { count: urls.length }));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [galleryCount, inviteToken, addToast, t]);

  const downloadIcs = useCallback(() => {
    if (!weddingDate?.year || !weddingDate.month || !weddingDate.day) {
      addToast("info", t("manage.noWeddingDate"));
      return;
    }
    const monthNum = MONTH_TO_NUM[weddingDate.month] || 1;
    const start = new Date(Date.UTC(Number(weddingDate.year), monthNum - 1, Number(weddingDate.day), Number(weddingDate.hour) || 12, Number(weddingDate.minute) || 0));
    const stamp = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(start.getTime() + 3600000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedingo//ES", "BEGIN:VEVENT",
      `UID:${inviteToken}@wedingo`, `DTSTAMP:${stamp}`, `DTSTART:${stamp}`, `DTEND:${end}`,
      `SUMMARY:${coupleName || "Boda"} — Wedingo`,
      weddingPlace ? `LOCATION:${weddingPlace.replace(/[\n,;]/g, "\\,")}` : "",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    downloadText(`${inviteToken}.ics`, ics, "text/calendar;charset=utf-8");
  }, [weddingDate, weddingPlace, coupleName, inviteToken, addToast, t]);

  // ── Resumen de menús y plazas (se calculan en el parent y se pasan) ──
  // Nota interna del responsable (config.internalNote).
  const [internalNote, setInternalNote] = useState("");
  useEffect(() => {
    void getDoc(doc(db, "invitations", inviteToken)).then((s) => {
      if (s.exists()) setInternalNote(String(s.data().internalNote || ""));
    });
  }, [inviteToken]);
  const saveNote = useCallback(async () => {
    try {
      await updateDoc(doc(db, "invitations", inviteToken), { internalNote: internalNote.slice(0, 2000) });
      addToast("success", t("errors.configSaved"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [inviteToken, internalNote, addToast, t]);

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0, gap: "0.75rem" }}>
      {/* Badge de confirmaciones nuevas */}
      {newCount > 0 ? (
        <p className="setup-success" role="status">
          {t("tools.newConfirmations", { count: newCount })}
        </p>
      ) : null}

      {/* Recordatorio WhatsApp */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("tools.whatsappReminder")}</p>
        <textarea className="setup-textarea" rows={3} value={reminder} onChange={(e) => setReminder(e.target.value)} placeholder={t("tools.reminderPlaceholder")} aria-label={t("tools.whatsappReminder")} />
        <button className="setup-button" type="button" onClick={openReminder}>
          {t("tools.openWhatsapp")}
        </button>
      </div>

      {/* Lista de invitados esperados */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("tools.expectedGuests")}</p>
        <p className="setup-help">{t("tools.expectedHelp")}</p>
        <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <input className="setup-input" value={newGuest} onChange={(e) => setNewGuest(e.target.value)} placeholder={t("tools.guestPlaceholder")} maxLength={120} aria-label={t("tools.guestPlaceholder")} />
          <button className="setup-button setup-button--compact" type="button" onClick={() => void addGuest()}>{t("tools.addGuest")}</button>
        </div>
        <p className="setup-help" style={{ margin: "0.5rem 0 0" }}>
          {t("tools.missingCount", { count: missing.length })}
        </p>
        {missing.length > 0 ? (
          <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--setup-subtitle)" }}>
            {missing.slice(0, 30).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="setup-success" style={{ margin: "0.3rem 0 0" }}>{t("tools.allConfirmed")}</p>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("tools.quickActions")}</p>
        <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="setup-button setup-button--compact" type="button" onClick={() => void downloadGallery()} disabled={galleryCount === 0}>
            {t("tools.downloadGallery", { count: galleryCount })}
          </button>
          <button className="setup-button setup-button--compact" type="button" onClick={downloadIcs}>
            {t("tools.icsButton")}
          </button>
          <a className="setup-button setup-button--ghost setup-button--compact" href={`${inviteUrl}`} target="_blank" rel="noreferrer">
            {t("tools.present")}
          </a>
        </div>
      </div>

      {/* Nota interna */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("tools.internalNote")}</p>
        <textarea className="setup-textarea" rows={3} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder={t("tools.internalNotePlaceholder")} aria-label={t("tools.internalNote")} />
        <button className="setup-button" type="button" onClick={() => void saveNote()}>{t("tools.saveNote")}</button>
      </div>

      {/* Extras diferenciales: buzón y fotos del día (mesas y mapa → Distribución) */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("tools.mailbox")}</p>
        <p className="setup-help">{t("tools.mailboxHelp")}</p>
        {mailbox.length > 0 ? (
          <ul style={{ margin: "0.5rem 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {mailbox.map((m) => (
              <li key={m.id} style={{ border: "1px solid var(--setup-border)", borderRadius: "0.5rem", padding: "0.45rem 0.6rem" }}>
                <div className="admin-flex" style={{ gap: "0.5rem", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "0.8rem" }}>{m.guestName}</strong>
                  <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void deleteMail(m.id)}>
                    {t("tools.delete")}
                  </button>
                </div>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--setup-subtitle)", whiteSpace: "pre-wrap" }}>{m.message}</p>
                {m.ts ? <p className="setup-help" style={{ margin: "0.2rem 0 0", fontSize: "0.7rem" }}>{m.ts}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="setup-help" style={{ margin: "0.4rem 0 0" }}>{t("tools.noMail")}</p>
        )}
        {mailbox.length > 0 && (
          <button className="setup-button setup-button--ghost setup-button--compact" style={{ marginTop: "0.6rem" }} type="button" onClick={() => void exportMailboxXlsx()}>
            {t("tools.exportMailbox")}
          </button>
        )}
      </div>

      <div className="setup-background-panel">
        <p className="setup-label">{t("tools.dayPhotos")}</p>
        <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="setup-button setup-button--compact" type="button" onClick={() => void downloadDayPhotos()} disabled={dayPhotoCount === 0}>
            {t("tools.downloadDayPhotos", { count: dayPhotoCount })}
          </button>
          <button className="setup-button setup-button--compact" type="button" onClick={() => void exportGuestsXlsx()}>
            {t("tools.exportGuests")}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ToolsTab;
