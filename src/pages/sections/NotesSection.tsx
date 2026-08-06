import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { withWriteRetry } from "../../lib/async-utils";

interface Note { id: string; guestName: string; message: string; }

/**
 * NotesSection — Muro de dedicatorias: los invitados dejan un mensaje que
 * se muestra en la invitación (las reglas sanea el texto con isSafeText).
 */
export default function NotesSection({ inviteToken }: { inviteToken?: string }) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!inviteToken) return;
    void getDocs(collection(db, "invitations", inviteToken, "notes")).then((snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as { guestName: string; message: string }) }));
      setNotes(list.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 50));
    }).catch(() => {});
  }, [inviteToken]);

  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken || !name.trim() || !message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await withWriteRetry(() => addDoc(collection(db, "invitations", inviteToken, "notes"), {
        guestName: name.trim().slice(0, 60),
        message: message.trim().slice(0, 500),
        createdAt: serverTimestamp(),
      }));
      setName("");
      setMessage("");
      load();
    } catch {
      setError(t("notes.error"));
    } finally {
      setSending(false);
    }
  }, [inviteToken, name, message, sending, t, load]);

  return (
    <div>
      <div className="notes-wall" aria-live="polite">
        {notes.length === 0 ? <p className="setup-help">{t("notes.empty")}</p> : null}
        {notes.map((n) => (
          <div className="notes-wall__item" key={n.id}>
            <p className="notes-wall__name">{n.guestName}</p>
            <p className="notes-wall__text">“{n.message}”</p>
          </div>
        ))}
      </div>
      <form className="notes-form" onSubmit={submit}>
        <input className="setup-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("notes.namePlaceholder")} maxLength={60} aria-label={t("notes.namePlaceholder")} />
        <textarea className="setup-textarea" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("notes.messagePlaceholder")} maxLength={500} aria-label={t("notes.messagePlaceholder")} />
        {error ? <p className="setup-error" role="alert">{error}</p> : null}
        <button className="setup-button" type="submit" disabled={sending || !name.trim() || !message.trim()}>{sending ? t("common.loading") : t("notes.send")}</button>
      </form>
    </div>
  );
}
