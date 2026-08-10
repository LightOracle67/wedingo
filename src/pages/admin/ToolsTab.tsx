import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection, doc, setDoc, getDoc, updateDoc, addDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
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

  // ── Asignador de mesas (diferencial) ──
  const [tables, setTables] = useState<Array<{ id: string; name: string; seats: number; guests: string[] }>>([]);
  const [newTableName, setNewTableName] = useState("");
  const [newTableSeats, setNewTableSeats] = useState("8");

  const load = useCallback(async () => {
    try {
      const [guestsSnap, rsvpSnap, galSnap, tablesSnap] = await Promise.all([
        getDocs(collection(db, "invitations", inviteToken, "guests")),
        getDocs(rsvpByInviteRef(inviteToken)),
        getDocs(collection(db, "invitations", inviteToken, "gallery")),
        getDocs(collection(db, "invitations", inviteToken, "tables")),
      ]);
      setTables(
        tablesSnap.docs.map((d) => ({
          id: d.id,
          name: String(d.data().name || ""),
          seats: Number(d.data().seats) || 0,
          guests: Array.isArray(d.data().guests) ? (d.data().guests as string[]) : [],
        })),
      );
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

  // ── Asignador de mesas ──
  const tablesRef = useCallback(() => collection(db, "invitations", inviteToken, "tables"), [inviteToken]);

  const addTable = useCallback(async () => {
    const name = newTableName.trim();
    const seats = Math.min(100, Math.max(0, Number(newTableSeats) || 0));
    if (!name) return;
    try {
      await addDoc(tablesRef(), { name: name.slice(0, 80), seats, guests: [], createdAt: new Date().toISOString() });
      setNewTableName("");
      setTables((prev) => [...prev, { id: `${Date.now()}`, name: name.slice(0, 80), seats, guests: [] }]);
      addToast("success", t("tools.tableAdded"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [newTableName, newTableSeats, tablesRef, addToast, t]);

  const deleteTable = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(tablesRef(), id));
        setTables((prev) => prev.filter((x) => x.id !== id));
        addToast("success", t("tools.tableDeleted"));
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [tablesRef, addToast, t],
  );

  const assignGuest = useCallback(
    async (tableId: string, name: string) => {
      const clean = name.trim().slice(0, 120);
      if (!clean) return;
      try {
        await updateDoc(doc(tablesRef(), tableId), { guests: arrayUnion(clean) });
        setTables((prev) => prev.map((tb) => (tb.id === tableId ? { ...tb, guests: [...tb.guests, clean] } : tb)));
        addToast("success", t("tools.guestAssigned"));
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [tablesRef, addToast, t],
  );

  const removeGuest = useCallback(
    async (tableId: string, name: string) => {
      try {
        await updateDoc(doc(tablesRef(), tableId), { guests: arrayRemove(name) });
        setTables((prev) => prev.map((tb) => (tb.id === tableId ? { ...tb, guests: tb.guests.filter((g) => g !== name) } : tb)));
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [tablesRef, addToast, t],
  );

  const openReminder = useCallback(() => {
    const text = reminder.trim() || `${t("tools.reminderDefault")} ${coupleName || ""}\n\n${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }, [reminder, inviteUrl, coupleName, t]);

  const downloadGallery = useCallback(async () => {
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
  }, [inviteToken, addToast, t]);

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

      {/* Asignador de mesas (diferencial) */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("tools.tables")}</p>
        <p className="setup-help">{t("tools.tablesHelp")}</p>
        <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <input className="setup-input" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder={t("tools.tableNamePlaceholder")} maxLength={80} aria-label={t("tools.tableNamePlaceholder")} />
          <input className="setup-input" type="number" min={0} max={100} style={{ width: "5rem" }} value={newTableSeats} onChange={(e) => setNewTableSeats(e.target.value)} aria-label={t("tools.tableSeats")} />
          <button className="setup-button setup-button--compact" type="button" onClick={() => void addTable()}>{t("tools.addTable")}</button>
        </div>
        {tables.length > 0 ? (
          <ul style={{ margin: "0.75rem 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {tables.map((tb) => (
              <li key={tb.id} style={{ border: "1px solid var(--setup-border)", borderRadius: "0.5rem", padding: "0.5rem 0.7rem" }}>
                <div className="admin-flex" style={{ gap: "0.5rem", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <p className="setup-label" style={{ margin: 0 }}>
                    {tb.name} · {tb.guests.length}/{tb.seats}
                  </p>
                  <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void deleteTable(tb.id)}>
                    {t("tools.deleteTable")}
                  </button>
                </div>
                <TableAssignRow tableId={tb.id} guests={tb.guests} onAssign={assignGuest} onRemove={removeGuest} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="setup-help" style={{ margin: "0.5rem 0 0" }}>{t("tools.noTables")}</p>
        )}
      </div>
    </div>
  );
});

/** Fila de una mesa: asigna/elimina invitados por nombre (buscable). */
function TableAssignRow({  tableId,
  guests,
  onAssign,
  onRemove,
}: {
  tableId: string;
  guests: string[];
  onAssign: (tableId: string, name: string) => void;
  onRemove: (tableId: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const submit = () => {
    if (value.trim()) {
      onAssign(tableId, value);
      setValue("");
    }
  };
  return (
    <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <div className="admin-flex" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
        <input className="setup-input" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder={t("tools.assignPlaceholder")} maxLength={120} aria-label={t("tools.assignPlaceholder")} />
        <button type="button" className="setup-button setup-button--compact" onClick={submit}>{t("tools.assign")}</button>
      </div>
      {guests.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {guests.map((g, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", border: "1px solid var(--setup-border)", borderRadius: "999px", padding: "0.15rem 0.5rem", color: "var(--setup-subtitle)" }}>
              {g}
              <button type="button" aria-label={t("tools.removeGuest")} onClick={() => onRemove(tableId, g)} style={{ background: "none", border: 0, cursor: "pointer", color: "#ef4444", fontSize: "0.85rem" }}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ToolsTab;
