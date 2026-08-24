import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { db, rsvpByInviteRef } from "../../lib/firebase";
import { useToast } from "../../hooks/useToast";
import { downloadText } from "../../lib/file-utils";
import { buildIcsFile } from "../../lib/calendar-utils";

interface ToolsTabProps {
  inviteToken: string;
  inviteUrl: string;
  weddingDate?: { year: string; month: string; day: string; hour?: string; minute?: string };
  weddingPlace?: string;
  coupleName?: string;
  /** Nº de invitados esperados (config, string "0".."1000"; "" = sin definir). */
  expectedGuests?: string;
  /** Se invoca tras guardar expectedGuests (recarga la config para las stats). */
  onExpectedGuestsSaved?: () => void | Promise<void>;
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
const ToolsTab = memo(function ToolsTab({
  inviteToken,
  inviteUrl,
  weddingDate,
  weddingPlace,
  coupleName,
  expectedGuests = "",
  onExpectedGuestsSaved,
}: ToolsTabProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();

  // ── Recordatorio WhatsApp ──
  const [reminder, setReminder] = useState("");

  // ── Invitados esperados (número 0..1000, guardado en config) ──
  const [guestsInput, setGuestsInput] = useState(expectedGuests);

  // ── Badge de confirmaciones nuevas ──
  const [newCount, setNewCount] = useState(0);
  // Personas confirmadas (para el recordatorio con el nº de pendientes).
  const [confirmedPeople, setConfirmedPeople] = useState(0);

  // ── Galería ──
  const [galleryCount, setGalleryCount] = useState(0);


  const load = useCallback(async () => {
    try {
      const [rsvpSnap, galSnap] = await Promise.all([
        getDocs(rsvpByInviteRef(inviteToken)),
        getDocs(collection(db, "invitations", inviteToken, "gallery")),
      ]);

      setGalleryCount(galSnap.size || 0);
      // Personas confirmadas (1 + acompañantes por "yes") para el recordatorio.
      setConfirmedPeople(
        rsvpSnap.docs.reduce(
          (s, d) => s + (d.data().attendance === "yes" ? Number(d.data().companions) || 1 : 0),
          0,
        ),
      );
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

  // ── Invitados esperados: guarda el número (0..1000) en la config ──
  const saveExpectedGuests = useCallback(async () => {
    try {
      // Se normaliza y acota (los no numéricos y >1000 se descartan).
      const raw = guestsInput.replace(/[^0-9]/g, "");
      const value = raw ? String(Math.min(Number(raw) || 0, 1000)) : "";
      if (value !== expectedGuests) {
        await updateDoc(doc(db, "invitations", inviteToken), { expectedGuests: value });
        addToast("success", t("tools.expectedGuestsSaved"));
        if (onExpectedGuestsSaved) await onExpectedGuestsSaved();
      }
      setGuestsInput(value);
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [guestsInput, expectedGuests, inviteToken, onExpectedGuestsSaved, addToast, t]);



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
      const { decrypt } = await import("../../lib/crypto-utils");
      const imgs = snap.docs.map((d) => ({ id: d.id, data: String(d.data().data || "") }));
      // Las imágenes de la galería se guardan CIFRADAS (AES-GCM): antes se
      // usaba `img.data` (ciphertext) como href, descargando basura ilegible
      // y una ruta relativa rota. Ahora se descifran una a una.
      const urls: Array<{ id: string; url: string }> = [];
      for (const img of imgs) {
        if (!img.data) continue;
        const url = await decrypt(img.data, inviteToken);
        if (url) urls.push({ id: img.id, url });
      }
      if (urls.length === 0) {
        addToast("info", t("tools.noGalleryPhotos"));
        return;
      }
      for (const { id, url } of urls) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `wedingo-${id}.webp`;
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
    // COMPORTAMIENTO SEGURO: se valida el rollover de la fecha ("31 de
    // febrero" normaliza a 3 de marzo); si no cuadra no se genera un .ics
    // corrupto y se avisa al responsable.
    // Hora/miunte: "" o ausente → 12:00 por defecto; pero la hora "0"
    // (medianoche, válida) NO debe tratarse como vacía (fix: ?? en vez de ||).
    const hour = weddingDate.hour && weddingDate.hour !== "" ? Number(weddingDate.hour) : 12;
    const minute = weddingDate.minute && weddingDate.minute !== "" ? Number(weddingDate.minute) : 0;
    const start = new Date(Number(weddingDate.year), monthNum - 1, Number(weddingDate.day), hour, minute);
    if (
      start.getFullYear() !== Number(weddingDate.year) ||
      start.getMonth() !== monthNum - 1 ||
      start.getDate() !== Number(weddingDate.day)
    ) {
      addToast("info", t("manage.noWeddingDate"));
      return;
    }
    const end = new Date(start.getTime() + 3600000);
    const ics = buildIcsFile({
      title: `${coupleName || "Boda"} — Wedingo`,
      place: weddingPlace || "",
      description: "",
      startDate: start,
      endDate: end,
      uid: `${inviteToken}@wedingo`,
    });
    if (!ics) {
      addToast("info", t("manage.noWeddingDate"));
      return;
    }
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
        <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="setup-button" type="button" onClick={openReminder}>
            {t("tools.openWhatsapp")}
          </button>
          <button
            className="setup-button setup-button--ghost setup-button--compact"
            type="button"
            onClick={() => setReminder(t("tools.reminderGenerated", { count: Math.max(0, Number(expectedGuests) - confirmedPeople) }))}
            disabled={!Number(expectedGuests)}
          >
            {t("tools.generateReminder")}
          </button>
        </div>
        {Number(expectedGuests) > 0 ? (
          <p className="setup-help" style={{ margin: "0.4rem 0 0", fontSize: "0.75rem" }}>
            {t("tools.pendingConfirm", { count: Math.max(0, Number(expectedGuests) - confirmedPeople) })}
          </p>
        ) : null}
      </div>

      {/* Invitados esperados: número 0..1000 para las estadísticas */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("tools.expectedGuests")}</p>
        <p className="setup-help">{t("tools.expectedHelp")}</p>
        <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="setup-input"
            type="number"
            inputMode="numeric"
            min={0}
            max={1000}
            step={1}
            value={guestsInput}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
              setGuestsInput(digits);
            }}
            onBlur={() => void saveExpectedGuests()}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveExpectedGuests();
            }}
            placeholder="0"
            aria-label={t("tools.expectedGuests")}
            style={{ maxWidth: "8rem" }}
          />
          <button className="setup-button setup-button--compact" type="button" onClick={() => void saveExpectedGuests()}>
            {t("tools.saveGuests")}
          </button>
        </div>
        <p className="setup-help" style={{ margin: "0.5rem 0 0" }}>
          {t("tools.expectedGuestsMax")}
        </p>
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

    </div>
  );
});

export default ToolsTab;
