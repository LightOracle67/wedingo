import { memo, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { randomMessage } from "../lib/invite-messages";

const EnvelopeOverlay = memo(function EnvelopeOverlay({ onOpen, firstName, secondName }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [flashPhase, setFlashPhase] = useState(0);
  const [goldenPhase, setGoldenPhase] = useState(0);

  const message = useMemo(() => randomMessage(i18n.language), [i18n.language]);

  const handleClick = useCallback(() => {
    if (open) return;
    setOpen(true);
    const t1 = setTimeout(() => setFlashPhase(1), 550);
    const t2 = setTimeout(() => { setFlashPhase(2); setGoldenPhase(1); }, 1050);
    const t3 = setTimeout(() => {
      setGoldenPhase(2);
      setExiting(true);
      setTimeout(() => onOpen(), 800);
    }, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onOpen, open]);

  return (
    <div className={`envelope-overlay ${exiting ? "envelope-overlay--exit" : ""}`} onClick={handleClick}>
      <div className={`envelope-flash ${flashPhase === 1 ? "envelope-flash--in" : flashPhase === 2 ? "envelope-flash--out" : ""}`} />
      {goldenPhase > 0 && (
        <p className={`envelope-golden ${goldenPhase === 1 ? "envelope-golden--in" : "envelope-golden--out"}`}>{message}</p>
      )}
      <div className={`envelope-wrapper ${open ? "envelope-wrapper--open" : ""}`}>
        <div className="envelope">
          <div className="envelope__flap">
            <div className="envelope__flap-inner" />
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
      ) : null}
    </div>
  );
});

export default EnvelopeOverlay;
