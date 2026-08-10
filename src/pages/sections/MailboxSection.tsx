/**
 * MailboxSection — Buzón de mensajes privados (diferencial).
 *
 * Los invitados escriben mensajes que SOLO lee la pareja (lectura admin-only
 * en las reglas). El invitado no ve los mensajes ajenos.
 */
import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInviteSubcollection } from "../../hooks/useInviteSubcollection";
import { useToast } from "../../hooks/useToast";

const MailboxSection = memo(function MailboxSection({ inviteToken }: { inviteToken: string }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const { add, busy } = useInviteSubcollection(inviteToken, "mailbox");

  const submit = useCallback(async () => {
    const text = message.trim();
    if (!text || busy) return;
    const id = await add({
      guestName: (name.trim() || t("mailbox.anonymous")).slice(0, 60),
      message: text.slice(0, 600),
    });
    if (id) {
      setSent(true);
      setMessage("");
      addToast("success", t("mailbox.sent"));
    } else {
      addToast("error", t("mailbox.error"));
    }
  }, [message, name, add, busy, addToast, t]);

  return (
    <div className="story-panel__inner">
      {sent ? (
        <p className="setup-success" style={{ textAlign: "center" }}>{t("mailbox.thanks")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input className="setup-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("mailbox.namePlaceholder")} maxLength={60} aria-label={t("mailbox.namePlaceholder")} />
          <textarea className="setup-textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("mailbox.messagePlaceholder")} maxLength={600} aria-label={t("mailbox.messagePlaceholder")} />
          <button type="button" className="setup-button" onClick={() => void submit()} disabled={busy || !message.trim()}>
            {busy ? t("common.loading") : t("mailbox.send")}
          </button>
          <p className="setup-help" style={{ margin: 0, fontSize: "0.72rem", textAlign: "center" }}>
            {t("mailbox.privateHint")}
          </p>
        </div>
      )}
    </div>
  );
});

export default MailboxSection;
