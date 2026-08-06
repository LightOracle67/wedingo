import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { randomMessage } from "../../lib/invite-messages";

export interface ShareTabProps {
  inviteToken: string;
  addToast?: (type: string, message: string, duration?: number) => number;
}

const APPS = (t: TFunction) => [
  { key: "whatsapp", label: t("share.whatsapp"), url: (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}` },
  { key: "telegram", label: t("share.telegram"), url: (text: string) => `https://t.me/share/url?url=${encodeURIComponent(text.split("\n").pop() ?? "")}&text=${encodeURIComponent(text)}` },
  { key: "sms", label: t("share.sms"), url: (text: string) => `sms:?body=${encodeURIComponent(text)}` },
];

const ShareTab = memo(function ShareTab({ inviteToken, addToast }: ShareTabProps) {
  const { t, i18n } = useTranslation();
  const baseUrl = `${window.location.origin}/${inviteToken}`;
  const inviteUrl = `${baseUrl}?invitar`;

  const generateMessage = useCallback(
    () => `${randomMessage(i18n.language)}\n\n${inviteUrl}`,    [inviteUrl, i18n.language],
  );

  const [message, setMessage] = useState(generateMessage);

  const handleRandom = useCallback(() => {
    setMessage(generateMessage());
  }, [generateMessage]);

  const shareVia = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      if (addToast) addToast("success", t("share.linkCopied"));
    } catch {
      if (addToast) addToast("error", t("errors.clipboardCopyFailed"));
    }
  }, [inviteUrl, addToast, t]);

  const printPdf = useCallback(() => {
    window.open(`${window.location.origin}/${inviteToken}/print`, "_blank");
  }, [inviteToken]);

  // QR del enlace de la invitación, generado en cliente (sin enviar la URL a
  // ningún servicio externo). La librería se carga bajo demanda.
  const [qrUrl, setQrUrl] = useState("");
  const [qrError, setQrError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then((QRCode) => {
      QRCode.toDataURL(inviteUrl, { width: 180, margin: 1, errorCorrectionLevel: "M" })
        .then((url: string) => { if (!cancelled) setQrUrl(url); })
        .catch(() => { if (!cancelled) setQrError(true); });
    }).catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [inviteUrl]);

  // Copia el QR como imagen PNG al portapapeles (para pegarlo en una
  // invitación física, WhatsApp, etc.).
  const [qrCopied, setQrCopied] = useState(false);
  const copyQr = useCallback(async () => {
    if (!qrUrl) return;
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      if (navigator.clipboard && "write" in navigator.clipboard) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setQrCopied(true);
        if (addToast) addToast("success", t("share.copyQrDone"));
        setTimeout(() => setQrCopied(false), 2500);
      } else {
        if (addToast) addToast("error", t("share.copyQrFailed"));
      }
    } catch {
      if (addToast) addToast("error", t("share.copyQrFailed"));
    }
  }, [qrUrl, addToast, t]);

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

      <label className="setup-label" htmlFor="shareMessage" style={{ marginBottom: "0.5rem", display: "block" }}>{t("share.message")}</label>
      <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
        <textarea
          id="shareMessage"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          aria-describedby="shareMessageHint"
          style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: "0.9rem", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--setup-border)", background: "var(--setup-bg)", color: "var(--setup-text)" }}
        />
        <p className="setup-help" id="shareMessageHint" style={{ marginTop: "0.4rem" }}>{t("share.messageHint")}</p>
        <button className={btnGhostClass} type="button" onClick={handleRandom} style={{ marginTop: "0.5rem" }}>
          {t("share.generateMessage")}
        </button>
        <button className={btnGhostClass} type="button" onClick={() => {
          navigator.clipboard.writeText(message)
            .then(() => { if (addToast) addToast("success", t("share.messageCopied")); })
            .catch(() => { if (addToast) addToast("error", t("errors.clipboardCopyFailed")); });
        }} style={{ marginTop: "0.5rem", marginLeft: "0.5rem" }}>
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

      {/* Código QR del enlace: se genera en el navegador. */}
      <div className="setup-token-card" style={{ marginTop: "1rem", padding: "1rem", textAlign: "center" }}>
        <div className="setup-label" style={{ marginBottom: "0.5rem" }}>{t("share.qrCode")}</div>
        {qrUrl ? (
          <>
            <img
              src={qrUrl}
              alt={t("share.qrCodeAlt", { url: inviteUrl })}
              width={180}
              height={180}
              style={{ borderRadius: "6px", background: "#fff", padding: "0.5rem" }}
            />
            <div style={{ marginTop: "0.6rem" }}>
              <button className={btnGhostClass} type="button" onClick={copyQr} disabled={!qrUrl}>
                {qrCopied ? t("share.copyQrDone") : t("share.copyQr")}
              </button>
            </div>
          </>
        ) : qrError ? (
          <p className="setup-help">{t("share.qrError")}</p>
        ) : (
          <div className="page-loading" style={{ width: 180, height: 180, margin: "0 auto" }} />
        )}
      </div>
    </>
  );
});

export default ShareTab;
