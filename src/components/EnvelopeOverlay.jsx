import { memo, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { randomMessage } from "../lib/invite-messages";

const EnvelopeOverlay = memo(function EnvelopeOverlay({ onOpen, firstName, secondName }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const message = useMemo(() => randomMessage(i18n.language), [i18n.language]);

  const handleClick = useCallback(() => {
    if (open) return;
    setOpen(true);
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => onOpen(), 800);
    }, 1400);
  }, [onOpen, open]);

  return (
    <div className={`envelope-overlay ${exiting ? "envelope-overlay--exit" : ""}`} onClick={handleClick}>
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
