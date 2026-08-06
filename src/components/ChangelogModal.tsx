import { memo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap, useEscapeKey } from "../hooks/useFocusTrap";
import { CHANGELOG } from "../lib/changelog";
import "../styles/modals.css";

/** Número de versiones mostradas por defecto (el resto queda bajo "ver todo"). */
const DEFAULT_VISIBLE = 5;

const ChangelogModal = memo(function ChangelogModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const modalRef = useFocusTrap<HTMLDivElement>(true);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }, [onClose]);

  useEscapeKey(handleClose, true);

  // Solo se renderizan las últimas versiones hasta que el usuario pide ver
  // el historial completo (80 entradas es un DOM pesado).
  const visible = showAll ? CHANGELOG : CHANGELOG.slice(0, DEFAULT_VISIBLE);

  return (
    <div className={`modal-overlay ${closing ? "modal-overlay--closing" : ""}`} onClick={handleClose} role="dialog" aria-modal="true" aria-label={t("changelog.title")}>
      <div className={`modal-card ${closing ? "modal-card--closing" : ""}`} ref={modalRef} onClick={(e) => e.stopPropagation()}
        style={{ width: "40%", height: "80%", display: "flex", flexDirection: "column", padding: "1.2rem 1rem 1rem" }}>
        <button className="modal-close" onClick={handleClose} aria-label={t("changelog.close")}>&times;</button>
        <p className="modal-title">{t("changelog.title")}</p>
        <div style={{ overflowY: "auto", flex: 1, marginTop: "0.5rem" }}>
          {visible.map((entry) => (
            <div key={entry.version} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--setup-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--setup-title)" }}>{t("common.version", { version: entry.version })}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--setup-muted)" }}>{entry.date}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--setup-subtitle)", lineHeight: 1.6 }}>
                {entry.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
          {!showAll && CHANGELOG.length > DEFAULT_VISIBLE ? (
            <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => setShowAll(true)} style={{ marginTop: "0.5rem" }}>
              {t("changelog.showAll")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default ChangelogModal;
