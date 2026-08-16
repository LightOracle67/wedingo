import { memo, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { randomMessage } from "../lib/invite-messages";
import { EMPTY_ANIMATION_SET } from "../lib/animations";
import "../styles/envelope.css";

const EnvelopeOverlay = memo(function EnvelopeOverlay({
  onOpen,
  onConfetti,
  firstName,
  secondName,
  customSeal,
  inviteToken,
  disabledAnimations,
}: {
  onOpen: () => void;
  onConfetti?: () => void;
  firstName: string;
  secondName: string;
  customSeal?: string | undefined;
  inviteToken?: string | undefined;
  /** Conjunto EFECTIVO de animaciones desactivadas (base del admin ∪
   *  invitado): la secuencia del sobre se adapta por código porque sus
   *  pasos (solapa, destello, texto dorado) son timing con estado. */
  disabledAnimations?: ReadonlySet<string>;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [showWhite, setShowWhite] = useState(false);
  const [showText, setShowText] = useState(false);
  // Ids de los setTimeout de la secuencia de apertura: se limpian al
  // desmontar para que el onOpen no se dispare sobre un sobre ya retirado.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Preferencias de animación del sobre (resueltas en booleans una sola vez).
  const disabled = disabledAnimations ?? EMPTY_ANIMATION_SET;
  const flapEnabled = !disabled.has("envelope-flap");
  const flashEnabled = !disabled.has("envelope-flash");
  const goldenEnabled = !disabled.has("envelope-golden-text");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      // Si el usuario navega antes de que acabe la secuencia (hasta 3.5s),
      // se cancelan los temporizadores pendientes (onOpen, onConfetti, etc.).
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
      document.body.style.overflow = "";
    };
  }, []);

  // Mensaje fijo por invitación (sessionStorage), mismo que usa la página de
  // impresión: el sobre y el PDF muestran el mismo texto.
  const message = useMemo(() => {
    const key = `wedin_print_msg_${inviteToken || ""}_${i18n.language || "es"}`;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) return stored;
    } catch {
      /* almacenamiento no disponible */
    }
    const raw = randomMessage(i18n.language ?? "es") ?? "";
    try {
      sessionStorage.setItem(key, raw);
    } catch {
      /* noop */
    }
    return raw;
  }, [i18n.language, inviteToken]);

  // Trampa de foco: mientras el sobre está cerrado, el teclado no puede
  // salir del overlay (el contenido trasero está inerte en la página).
  const overlayRef = useFocusTrap<HTMLDivElement>(true);

  const handleClick = useCallback(() => {
    if (exiting) {
      return;
    }
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
    };
    if (!open) {
      // Con la solapa desactivada, la secuencia de dos gestos no tiene
      // sentido (la solapa ES la revelación): un solo toque abre la
      // invitación al instante y dispara el confeti.
      if (!flapEnabled) {
        setOpen(true);
        onConfetti?.();
        document.body.style.overflow = "";
        const main = document.getElementById("main-content");
        if (main) main.focus({ preventScroll: true });
        onOpen();
        return;
      }
      setOpen(true);
      if (flashEnabled) {
        schedule(() => {
          setShowWhite(true);
        }, 600);
      }
      if (goldenEnabled) {
        schedule(() => {
          setShowText(true);
        }, 1400);
      }
      return;
    }

    setExiting(true);
    try {
      window.dispatchEvent(new CustomEvent("wedin:play-audio"));
    } catch {}
    // El texto dorado tarda 2.5s en desvanecerse (opacity 2s / transform 2.5s)
    // y el propio overlay hace un fade de 2.5s: al terminar esa última
    // animación (t=2500) la invitación queda al descubierto y el hero arranca
    // SU animación de entrada, sincronizada con la salida del sobre (antes
    // tardaba 1s más en aparecer, desconectado del desvanecimiento).
    schedule(() => onConfetti?.(), 2600);
    schedule(() => {
      document.body.style.overflow = "";
      const main = document.getElementById("main-content");
      if (main) main.focus({ preventScroll: true });
      onOpen();
    }, 2500);
  }, [onOpen, onConfetti, open, exiting, flapEnabled, flashEnabled, goldenEnabled]);

  return (
    <div
      ref={overlayRef}
      className={`envelope-overlay ${exiting ? "envelope-overlay--exit" : ""}`}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={t("envelope.tapContinue")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
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
              <p className="envelope__letter-names">
                {firstName} <span className="envelope__letter-ampersand">&</span> {secondName}
              </p>
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
