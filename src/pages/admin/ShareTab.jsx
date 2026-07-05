import { memo, useCallback, useMemo } from "react";
import { randomMessage } from "../../lib/invite-messages";

const ShareTab = memo(function ShareTab({ inviteToken, config, formattedDate, addToast }) {
  const baseUrl = `${window.location.origin}/${inviteToken}`;
  const inviteUrl = `${baseUrl}?invitar`;
  const coupleName = `${config.firstName} & ${config.secondName}`;

  const shareMessage = useMemo(() => randomMessage(coupleName), [coupleName]);

  const shareVia = useCallback((url) => {
    window.open(url, "_blank", "noreferrer");
  }, []);

  const shareWhatsApp = useCallback(() => {
    const message = `${shareMessage}\n\n${inviteUrl}`;
    shareVia(`https://wa.me/?text=${encodeURIComponent(message)}`);
  }, [shareMessage, inviteUrl, shareVia]);

  const shareInstagram = useCallback(async () => {
    const text = `${shareMessage}\n\n${inviteUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      if (addToast) addToast("success", "Mensaje copiado. Pégalo en Instagram.");
    } catch {
      if (addToast) addToast("error", "No se pudo copiar el mensaje.");
    }
  }, [shareMessage, inviteUrl, addToast]);

  const shareFacebook = useCallback(() => {
    shareVia(`https://facebook.com/sharer/sharer.php?${new URLSearchParams({ u: inviteUrl, quote: shareMessage })}`);
  }, [shareMessage, inviteUrl, shareVia]);

  const printPdf = useCallback(() => {
    window.open(`${baseUrl}?imprimir`, "_blank");
  }, [baseUrl]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {}
  }, [inviteUrl]);

  const btnClass = "setup-button setup-button--compact";
  const btnGhostClass = "setup-button setup-button--ghost setup-button--compact";

  return (
    <>
      <div className="setup-token-card" style={{ marginBottom: "1rem", padding: "0.7rem 1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>
          Tu invitación está publicada en:
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
            Copiar
          </button>
        </div>
      </div>

      <div className="setup-label" style={{ marginBottom: "0.5rem" }}>Compartir en redes</div>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <button className={btnClass} type="button" onClick={shareWhatsApp}>
          WhatsApp
        </button>
        <button className={btnClass} type="button" onClick={shareInstagram}>
          Instagram
        </button>
        <button className={btnClass} type="button" onClick={shareFacebook}>
          Facebook
        </button>
      </div>

      <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid var(--setup-border)" }} />

      <div className="setup-label" style={{ marginBottom: "0.5rem" }}>Imprimir</div>
      <button className={btnClass} type="button" onClick={printPdf}>
        Imprimir / Guardar PDF
      </button>
    </>
  );
});

export default ShareTab;
