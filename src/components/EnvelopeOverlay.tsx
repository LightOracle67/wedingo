import { memo, useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { randomMessage } from "../lib/invite-messages";
import "../styles/envelope.css";

const EnvelopeOverlay = memo(function EnvelopeOverlay({ onOpen, onConfetti, firstName, secondName, customSeal, inviteToken }: { onOpen: () => void; onConfetti?: () => void; firstName: string; secondName: string; customSeal?: string | undefined; inviteToken?: string | undefined }) {

  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [showWhite, setShowWhite] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {

    document.body.style.overflow = "hidden";
    return () => { ; document.body.style.overflow = ""; };
  }, []);

  // Mensaje fijo por invitación (sessionStorage), mismo que usa la página de
  // impresión: el sobre y el PDF muestran el mismo texto.
  const message = useMemo(() => {
    const key = `wedin_print_msg_${inviteToken || ""}_${i18n.language || "es"}`;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) return stored;
    } catch { /* almacenamiento no disponible */ }
    const raw = randomMessage(i18n.language ?? "es") ?? "";
    try { sessionStorage.setItem(key, raw); } catch { /* noop */ }
    return raw;
  }, [i18n.language, inviteToken]);

  // Trampa de foco: mientras el sobre está cerrado, el teclado no puede
  // salir del overlay (el contenido trasero está inerte en la página).
  const overlayRef = useFocusTrap<HTMLDivElement>(true);

  const handleClick = useCallback(() => {
    if (exiting) { ; return; }
    if (!open) {

      setOpen(true);
      setTimeout(() => { ; setShowWhite(true); }, 600);
      setTimeout(() => { ; setShowText(true); }, 1400);
      return;
    }

    setExiting(true);
    try { window.dispatchEvent(new CustomEvent("wedin:play-audio")); } catch {}
    // El texto dorado tarda 2.5s en desvanecerse (opacity 2s / transform 2.5s):
    // el confeti arranca justo al terminar ese fade out, detrás del sobre que
    // todavía se está yendo, de modo que ya cae cuando la invitación aparece.
    setTimeout(() => onConfetti?.(), 2600);
    setTimeout(() => {

      document.body.style.overflow = "";
      const main = document.getElementById("main-content");
      if (main) main.focus({ preventScroll: true });
      onOpen();
    }, 3500);
  }, [onOpen, onConfetti, open, exiting]);

  return (
    <div ref={overlayRef} className={`envelope-overlay ${exiting ? "envelope-overlay--exit" : ""}`} onClick={handleClick} tabIndex={0} role="button" aria-label={t("envelope.tapContinue")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}>
      <span className="envelope-light" data-light="1" />
      <span className="envelope-light" data-light="2" />
      <span className="envelope-light" data-light="3" />
      <div className={`envelope-flash ${showWhite ? "envelope-flash--visible" : ""}`} />
      {showText && (
        <div className={`envelope-golden ${!exiting ? "envelope-golden--in" : "envelope-golden--out"}`}>
          {customSeal ? <img src={customSeal} alt="" aria-hidden="true" className="envelope-golden__bg-seal" /> : null}
          <span className="envelope-golden__glow">{message}</span>
        </div>
      )}
      <div className={`envelope-wrapper ${open ? "envelope-wrapper--open" : ""}`}>
        <div className="envelope">
          <div className="envelope__flap">
            <div className="envelope__flap-inner" />
            <div className="envelope__seal">
              <div className="envelope__seal-wax">
                {customSeal ? (
                  <img src={customSeal} alt="" aria-hidden="true" className="envelope__seal-custom-img" />
                ) : (
                  <div className="envelope__seal-heart" />
                )}
              </div>
            </div>
          </div>
          <div className="envelope__panel envelope__panel--front">
            <div className="envelope__address">
              <span className="envelope__address-line envelope__address-line--bold">
                {firstName} {t("envelope.and")} {secondName}
              </span>
            </div>
            <div className="envelope__stamp">
              <div className="envelope__stamp-inner">♥</div>
            </div>
          </div>
          <div className="envelope__panel envelope__panel--back">
            <div className="envelope__letter">
              <p className="envelope__letter-names">{firstName} <span className="envelope__letter-ampersand">&</span> {secondName}</p>
              <p className="envelope__letter-message">{message}</p>
            </div>
          </div>
        </div>
      </div>
      {!open ? (
        <p className="envelope__hint">{t("envelope.tapHint")}</p>
      ) : !exiting ? (
        <p className="envelope__hint">{t("envelope.tapContinue")}</p>
      ) : null}
    </div>
  );
});

export default EnvelopeOverlay;
