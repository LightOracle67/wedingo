import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { randomMessage } from "../../lib/invite-messages";

const APPS = (t) => [
  { key: "whatsapp", label: t("share.whatsapp"), url: (text) => `https://wa.me/?text=${encodeURIComponent(text)}` },
  { key: "telegram", label: t("share.telegram"), url: (text) => `https://t.me/share/url?url=${encodeURIComponent(text.split("\n").pop())}&text=${encodeURIComponent(text)}` },
  { key: "sms", label: t("share.sms"), url: (text) => `sms:?body=${encodeURIComponent(text)}` },
];

const ShareTab = memo(function ShareTab({ inviteToken, config, formattedDate, addToast }) {
  const { t, i18n } = useTranslation();
  const baseUrl = `${window.location.origin}/${inviteToken}`;
  const inviteUrl = `${baseUrl}?invitar`;
  const coupleName = `${config.firstName} & ${config.secondName}`;

  const generateMessage = useCallback(
    () => `${randomMessage(i18n.language)}\n\n${inviteUrl}`,
    [coupleName, inviteUrl],
  );

  const [message, setMessage] = useState(generateMessage);

  const handleRandom = useCallback(() => {
    setMessage(generateMessage());
  }, [generateMessage]);

  const shareVia = useCallback((url) => {
    window.open(url, "_blank", "noreferrer");
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      if (addToast) addToast("success", t("share.linkCopied"));
    } catch {}
  }, [inviteUrl, addToast]);

  const printPdf = useCallback(() => {
    window.open(`${window.location.origin}/${inviteToken}/print`, "_blank");
  }, [inviteToken]);

  const btnClass = "setup-button setup-button--compact";
  const btnGhostClass = "setup-button setup-button--ghost setup-button--compact";

  return (
    <>
      <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>
          {t("share.publishedAt")}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--setup-accent)", fontSize: "0.9rem", wordBreak: "break-all" }}
          >
            {inviteUrl}
          </a>
          <button className={btnGhostClass} type="button" onClick={copyLink} style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", flexShrink: 0 }}>
            {t("common.copy")}
          </button>
        </div>
      </div>

      <div className="setup-label" style={{ marginBottom: "0.5rem" }}>{t("share.message")}</div>
      <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: "0.9rem", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--setup-border)", background: "var(--setup-bg)", color: "var(--setup-text)" }}
        />
        <button className={btnGhostClass} type="button" onClick={handleRandom} style={{ marginTop: "0.5rem" }}>
          {t("share.generateMessage")}
        </button>
        <button className={btnGhostClass} type="button" onClick={() => { navigator.clipboard.writeText(message); if (addToast) addToast("success", t("share.messageCopied")); }} style={{ marginTop: "0.5rem", marginLeft: "0.5rem" }}>
          {t("share.copyMessage")}
        </button>
      </div>

      <div className="setup-label" style={{ marginBottom: "0.5rem" }}>{t("share.shareVia")}</div>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {APPS(t).map((app) => (
          <button key={app.key} className={btnClass} type="button" onClick={() => shareVia(app.url(message))}>
            {app.label}
          </button>
        ))}
      </div>

      <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid var(--setup-border)" }} />

      <div className="setup-label" style={{ marginBottom: "0.5rem" }}>{t("share.print")}</div>
      <button className={btnClass} type="button" onClick={printPdf}>
        {t("share.printPdf")}
      </button>
    </>
  );
});

export default ShareTab;
