import { memo, useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";

export const PRIVACY_POLICY_VERSION = "2026-07-08";

const LegalModal = memo(/** @param {{ section: string, onClose: () => void }} props */ function LegalModal({ section, onClose }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(section || "");
  const [closing, setClosing] = useState(false);
  const isOpen = Boolean(section || open);
  const modalRef = useFocusTrap(isOpen);
  const closeRef = useRef(null);

  const SECTIONS = [
    { id: "privacy", label: t("legal.sectionPrivacy"), content: t("legal.privacyPolicy") },
    { id: "terms", label: t("legal.sectionTerms"), content: t("legal.termsText") },
    { id: "legal", label: t("legal.sectionLegal"), content: t("legal.legalText") },
  ];

  useEffect(() => {
    if (section) setOpen(section);
  }, [section]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleKey);
    closeRef.current = handleKey;
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }, [onClose]);

  const toggle = (id) => setOpen((prev) => (prev === id ? "" : id));

  return (
    <div className={`modal-overlay ${closing ? "modal-overlay--closing" : ""}`} onClick={handleClose} role="dialog" aria-modal="true" aria-label={t("legal.modalTitle")}>
      <div className={`modal-card ${closing ? "modal-card--closing" : ""}`} ref={modalRef} onClick={(e) => e.stopPropagation()}
        style={{ width: "min(95vw, 960px)", minWidth: "360px", maxHeight: "calc(100dvh - 2rem)", display: "flex", flexDirection: "column", padding: "1.2rem 1rem 1rem" }}>
        <button className="modal-close" onClick={handleClose} aria-label={t("common.close")}>&times;</button>
        <p className="modal-title">{t("legal.modalTitle")}</p>
        <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1, marginTop: "0.5rem", wordBreak: "break-word" }}>
          {SECTIONS.map((s) => (
            <div key={s.id}>
              <button type="button" onClick={() => toggle(s.id)}
                aria-expanded={open === s.id ? "true" : "false"}
                style={{
                  width: "100%", textAlign: "left", padding: "0.7rem 0",
                  border: "none", borderBottom: "1px solid var(--setup-border)",
                  background: "transparent", color: "var(--setup-title)", cursor: "pointer",
                  fontSize: "0.95rem", fontWeight: 600, fontFamily: "var(--font-body)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                <span>{s.label}</span>
                <span style={{
                  transform: open === s.id ? "rotate(135deg)" : "rotate(0deg)",
                  transition: "transform 300ms ease", fontSize: "1rem", opacity: 0.5,
                }}>+</span>
              </button>
              <div style={{
                maxHeight: open === s.id ? "800px" : "0px", overflow: "hidden",
                transition: "max-height 400ms ease, opacity 300ms ease",
                opacity: open === s.id ? 1 : 0,
              }}>
                <div style={{
                  padding: "0.5rem 0 0.8rem", color: "var(--setup-subtitle)",
                  fontSize: "0.85rem", lineHeight: 1.65, whiteSpace: "pre-line",
                }}>
                  {s.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default LegalModal;
