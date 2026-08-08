import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInviteSubcollection } from "../../hooks/useInviteSubcollection";

interface Note {
  id: string;
  guestName: string;
  message: string;
}

/**
 * NotesSection — Muro de dedicatorias: los invitados dejan un mensaje que
 * se muestra en la invitación (las reglas sanea el texto con isSafeText).
 */
const NotesSection = memo(function NotesSection({ inviteToken }: { inviteToken?: string }) {
  const { t } = useTranslation();
  const { items: notes, add: addNote } = useInviteSubcollection<Note>(inviteToken, "notes", {
    map: ({ id, data }) => ({ id, guestName: data.guestName || "", message: data.message || "" }),
    sort: (a, b) => b.id.localeCompare(a.id),
    limit: 50,
  });
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !message.trim() || sending) return;
      setSending(true);
      setError("");
      const id = await addNote({
        guestName: name.trim().slice(0, 60),
        message: message.trim().slice(0, 500),
      });
      if (id !== null) {
        setName("");
        setMessage("");
      } else {
        setError(t("notes.error"));
      }
      setSending(false);
    },
    [name, message, sending, addNote, t],
  );

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
        <input
          className="setup-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("notes.namePlaceholder")}
          maxLength={60}
          aria-label={t("notes.namePlaceholder")}
        />
        <textarea
          className="setup-textarea"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("notes.messagePlaceholder")}
          maxLength={500}
          aria-label={t("notes.messagePlaceholder")}
        />
        {error ? (
          <p className="setup-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="setup-button" type="submit" disabled={sending || !name.trim() || !message.trim()}>
          {sending ? t("common.loading") : t("notes.send")}
        </button>
      </form>
    </div>
  );});

export default NotesSection;
