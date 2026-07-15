import { memo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

const EnvelopeOverlay = memo(function EnvelopeOverlay({ onOpen }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

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
              <span className="envelope__address-line">{t("envelope.addressLine1")}</span>
              <span className="envelope__address-line envelope__address-line--bold">{t("envelope.addressLine2")}</span>
            </div>
            <div className="envelope__stamp">
              <div className="envelope__stamp-inner">♥</div>
            </div>
          </div>
          <div className="envelope__panel envelope__panel--back">
            <div className="envelope__letter">
              <div className="envelope__letter-line envelope__letter-line--short" />
              <div className="envelope__letter-line" />
              <div className="envelope__letter-line" />
              <div className="envelope__letter-line envelope__letter-line--short" />
              <div className="envelope__letter-line envelope__letter-line--end" />
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
