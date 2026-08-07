import { memo, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

import "../styles/modals.css";

const LegalModal = memo(function LegalModal({ section, onClose }: { section: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(section || "");

  const SECTIONS = [
    { id: "privacy", label: t("legal.sectionPrivacy"), content: t("legal.privacyPolicy") },
    { id: "terms", label: t("legal.sectionTerms"), content: t("legal.termsText") },
    { id: "legal", label: t("legal.sectionLegal"), content: t("legal.legalText") },
  ];

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (section) setOpen(section);
  }, [section]);

  const toggle = (id: string) => setOpen((prev: string) => (prev === id ? "" : id));

  return (
    <Modal
      title={t("legal.modalTitle")}
      closeLabel={t("common.close")}
      onClose={handleClose}
      style={{
        width: "min(95vw, 960px)",
        minWidth: "min(95vw, 360px)",
        maxHeight: "calc(100dvh - 2rem)",
        display: "flex",
        flexDirection: "column",
        padding: "1.2rem 1rem 1rem",
      }}
    >
      <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1, marginTop: "0.5rem", wordBreak: "break-word" }}>
        {SECTIONS.map((s: { id: string; label: string; content: string }) => (
          <div key={s.id}>
            <button
              type="button"
              onClick={() => toggle(s.id)}
              aria-expanded={open === s.id ? "true" : "false"}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.7rem 0",
                border: "none",
                borderBottom: "1px solid var(--setup-border)",
                background: "transparent",
                color: "var(--setup-title)",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{s.label}</span>
              <span
                style={{
                  transform: open === s.id ? "rotate(135deg)" : "rotate(0deg)",
                  transition: "transform 300ms ease",
                  fontSize: "1rem",
                  opacity: 0.5,
                }}
              >
                +
              </span>
            </button>
            <div
              style={{
                maxHeight: open === s.id ? "800px" : "0px",
                overflow: "hidden",
                transition: "max-height 400ms ease, opacity 300ms ease",
                opacity: open === s.id ? 1 : 0,
              }}
            >
              <div
                style={{
                  padding: "0.5rem 0 0.8rem",
                  color: "var(--setup-subtitle)",
                  fontSize: "0.85rem",
                  lineHeight: 1.65,
                  whiteSpace: "pre-line",
                }}
              >
                {s.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
});

export default LegalModal;
