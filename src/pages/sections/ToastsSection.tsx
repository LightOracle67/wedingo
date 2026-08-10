/**
 * ToastsSection — Programa de brindis y discursos (diferencial).
 *
 * Los invitados se apuntan para dar un brindis; la lista es pública y el admin
 * gestiona/elimina turnos.
 */
import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInviteSubcollection } from "../../hooks/useInviteSubcollection";
import { useToast } from "../../hooks/useToast";

interface Toast {
  id: string;
  guestName: string;
  time?: string;
}

const ToastsSection = memo(function ToastsSection({ inviteToken }: { inviteToken: string }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const { items, add, busy } = useInviteSubcollection<Toast>(inviteToken, "toasts", {
    map: (d) => ({ id: d.id, guestName: String(d.data.guestName || ""), time: String(d.data.time || "") }),
  });

  const submit = useCallback(async () => {
    const n = name.trim();
    if (!n || busy) return;
    const id = await add({
      guestName: n.slice(0, 60),
      time: time.trim().slice(0, 20),
    });
    if (id) {
      setName("");
      setTime("");
      addToast("success", t("toasts.signedUp"));
    } else {
      addToast("error", t("toasts.error"));
    }
  }, [name, time, add, busy, addToast, t]);

  return (
    <div className="story-panel__inner">
      <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input className="setup-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("toasts.namePlaceholder")} maxLength={60} style={{ flex: 1, minWidth: "9rem" }} aria-label={t("toasts.namePlaceholder")} />
        <input className="setup-input" value={time} onChange={(e) => setTime(e.target.value)} placeholder={t("toasts.timePlaceholder")} maxLength={20} style={{ width: "7rem" }} aria-label={t("toasts.timePlaceholder")} />
        <button type="button" className="setup-button setup-button--compact" onClick={() => void submit()} disabled={busy || !name.trim()}>
          {busy ? t("common.loading") : t("toasts.signUp")}
        </button>
      </div>
      {items.length > 0 ? (
        <ul style={{ margin: "0.6rem 0 0", paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--invite-title-color)" }}>
          {items.map((toast) => (
            <li key={toast.id} style={{ marginBottom: "0.2rem" }}>
              {toast.guestName}
              {toast.time ? <span style={{ color: "var(--invite-copy-color)" }}> — {toast.time}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="setup-help" style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", textAlign: "center" }}>
          {t("toasts.empty")}
        </p>
      )}
    </div>
  );
});

export default ToastsSection;
