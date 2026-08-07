import { memo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CHANGELOG } from "../lib/changelog";
import Modal from "./Modal";
import "../styles/modals.css";

/** Número de versiones mostradas por defecto (el resto queda bajo "ver todo"). */
const DEFAULT_VISIBLE = 5;

const ChangelogModal = memo(function ChangelogModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const handleClose = useCallback(() => onClose(), [onClose]);

  // Solo se renderizan las últimas versiones hasta que el usuario pide ver
  // el historial completo (80 entradas es un DOM pesado).
  const visible = showAll ? CHANGELOG : CHANGELOG.slice(0, DEFAULT_VISIBLE);

  return (
    <Modal
      title={t("changelog.title")}
      closeLabel={t("changelog.close")}
      onClose={handleClose}
      style={{ width: "40%", height: "80%", display: "flex", flexDirection: "column", padding: "1.2rem 1rem 1rem" }}
    >
      <div style={{ overflowY: "auto", flex: 1, marginTop: "0.5rem" }}>
        {visible.map((entry) => (
          <div
            key={entry.version}
            style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--setup-border)" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.3rem",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--setup-title)" }}>
                {t("common.version", { version: entry.version })}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--setup-muted)" }}>{entry.date}</span>
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.2rem",
                fontSize: "0.85rem",
                color: "var(--setup-subtitle)",
                lineHeight: 1.6,
              }}
            >
              {entry.changes.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </div>
        ))}
        {!showAll && CHANGELOG.length > DEFAULT_VISIBLE ? (
          <button
            type="button"
            className="setup-button setup-button--ghost setup-button--compact"
            onClick={() => setShowAll(true)}
            style={{ marginTop: "0.5rem" }}
          >
            {t("changelog.showAll")}
          </button>
        ) : null}
      </div>
    </Modal>
  );
});

export default ChangelogModal;
