import { memo, useState, useCallback } from "react";

const EnvelopeOverlay = memo(function EnvelopeOverlay({ onOpen }) {
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleClick = useCallback(() => {
    setOpen(true);
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => onOpen(), 600);
    }, 800);
  }, [onOpen]);

  return (
    <div className={`envelope-overlay ${exiting ? "envelope-overlay--exit" : ""}`} onClick={!open ? handleClick : undefined}>
      <div className={`envelope ${open ? "envelope--open" : ""}`}>
        <div className="envelope__flap" />
        <div className="envelope__body">
          <div className="envelope__stamp">
            <span className="envelope__heart">♥</span>
          </div>
          <p className="envelope__text">Wedding Invitation</p>
        </div>
        {open ? <div className="envelope__letter">📜</div> : null}
      </div>
      {!open ? <p className="envelope__hint">Click to open</p> : null}
    </div>
  );
});

export default EnvelopeOverlay;
