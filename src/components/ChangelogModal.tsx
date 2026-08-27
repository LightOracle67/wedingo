import { memo, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import "../styles/modals.css";
import type { ChangelogEntry } from "../lib/changelog-types";

/** Número de versiones mostradas por defecto (el resto queda bajo "ver todo"). */
const DEFAULT_VISIBLE = 5;

/**
 * Tope de entradas renderizadas cuando el usuario pide el historial completo.
 * Evita pintar cientos de versiones en el DOM (el changelog remoto supera con
 * creces esta cifra); el resto se ofrece desde el enlace a GitHub.
 */
const MAX_ALL_VISIBLE = 60;

const ChangelogModal = memo(function ChangelogModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  // El changelog se carga al abrir desde GitHub (raw CHANGELOG.md) con caché en
  // localStorage y respaldo al bundle empaquetado si no hay red ni caché.
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    void import("../lib/remote-changelog").then((m) => m.loadChangelog().then((loaded) => {
      if (!cancelled) setEntries(loaded);
    }));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = useCallback(() => onClose(), [onClose]);

  // Solo se renderizan las últimas versiones hasta que el usuario pide ver
  // el historial completo, con tope MAX_ALL_VISIBLE para no saturar el DOM.
  const visible = showAll ? entries.slice(0, MAX_ALL_VISIBLE) : entries.slice(0, DEFAULT_VISIBLE);
  const hasMoreThanVisible = entries.length > (showAll ? MAX_ALL_VISIBLE : DEFAULT_VISIBLE);

  return (
    <Modal
      title={t("changelog.title")}
      closeLabel={t("changelog.close")}
      onClose={handleClose}
      style={{ width: "40%", height: "80%", display: "flex", flexDirection: "column", padding: "1.2rem 1rem 1rem" }}
    >
      <div style={{ marginTop: "0.5rem" }}>
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
        {!showAll && entries.length > DEFAULT_VISIBLE ? (
          <button
            type="button"
            className="setup-button setup-button--ghost setup-button--compact"
            onClick={() => setShowAll(true)}
            style={{ marginTop: "0.5rem" }}
          >
            {t("changelog.showAll")}
          </button>
        ) : null}
        {showAll && hasMoreThanVisible ? (
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "0.8rem",
              color: "var(--setup-muted)",
              lineHeight: 1.5,
            }}
          >
            {t("changelog.seeMoreInGitHub")}{" "}
            <a
              href="https://github.com/LightOracle67/wedingo/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--setup-accent)" }}
            >
              GitHub
            </a>
          </p>
        ) : null}
      </div>
    </Modal>
  );
});

export default ChangelogModal;
