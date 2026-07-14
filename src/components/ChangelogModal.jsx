import { memo, useEffect, useState, useCallback } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { CHANGELOG } from "../lib/changelog";

const ChangelogModal = memo(function ChangelogModal({ onClose }) {
  const [closing, setClosing] = useState(false);
  const modalRef = useFocusTrap(true);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }, [onClose]);

  return (
    <div className={`modal-overlay ${closing ? "modal-overlay--closing" : ""}`} onClick={handleClose} role="dialog" aria-modal="true" aria-label="Changelog">
      <div className={`modal-card ${closing ? "modal-card--closing" : ""}`} ref={modalRef} onClick={(e) => e.stopPropagation()}
        style={{ width: "min(95vw, 640px)", minWidth: "320px", maxHeight: "calc(100dvh - 2rem)", display: "flex", flexDirection: "column", padding: "1.2rem 1rem 1rem" }}>
        <button className="modal-close" onClick={handleClose} aria-label="Close">&times;</button>
        <p className="modal-title">Changelog</p>
        <div style={{ overflowY: "auto", flex: 1, marginTop: "0.5rem" }}>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--setup-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--setup-title)" }}>v{entry.version}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--setup-muted)" }}>{entry.date}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--setup-subtitle)", lineHeight: 1.6 }}>
                {entry.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ChangelogModal;
