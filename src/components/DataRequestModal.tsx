/**
 * DataRequestModal.tsx
 * ─────────────────────────────────────────────────────────────
 * Modal de autoservicio de datos (derechos RGPD/CCPA/LGPD) para el
 * invitado: permite exportar sus datos y eliminar los datos locales
 * (incluido el consentimiento de cookies) con confirmación previa.
 *
 * @module DataRequestModal
 */

import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useToast } from "../hooks/useToast";
import { useApp } from "../contexts";
import { eraseGuestLocalData, exportGuestLocalData } from "../lib/data-request";
import "../styles/modals.css";

interface DataRequestModalProps {
  /** Token de la invitación actual (para limpiar su caché). */
  inviteToken?: string;
  /** Cierra el modal. */
  onClose: () => void;
}

const DataRequestModal = memo(function DataRequestModal({ inviteToken, onClose }: DataRequestModalProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  // Respuestas del invitado ya cargadas (caché/descifradas): se incluyen en
  // el export de portabilidad cuando están disponibles.
  const { rsvpEntries } = useApp();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(true);

  /** Descarga un JSON con los datos del navegador y las respuestas (portabilidad). */
  const handleExport = () => {
    try {
      const { exported } = exportGuestLocalData(inviteToken);
      const payload = { ...(exported ?? {}), rsvp: rsvpEntries ?? [] };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wedingo-datos.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast("success", t("dataRequest.exportDone"));
    } catch {
      addToast("error", t("dataRequest.exportFail"));
    }
  };

  /** Elimina los datos locales y el consentimiento, con confirmación. */
  const handleErase = () => {
    // Confirmación explícita antes de destruir datos (no reversible).
    if (!window.confirm(t("dataRequest.eraseConfirm"))) return;
    const { erasedKeys } = eraseGuestLocalData(inviteToken);
    addToast("success", t("dataRequest.eraseDone", { count: erasedKeys.length }));
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("dataRequest.title")}
      data-testid="data-request-modal"
    >
      <div
        className="modal-card"
        ref={focusTrapRef}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(95vw, 640px)", minWidth: "min(95vw, 360px)", maxHeight: "calc(100dvh - 2rem)", display: "flex", flexDirection: "column", padding: "1.2rem 1rem 1rem" }}
      >
        <button className="modal-close" onClick={onClose} aria-label={t("common.close")}>&times;</button>
        <p className="modal-title">{t("dataRequest.title")}</p>
        <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1, marginTop: "0.5rem", wordBreak: "break-word" }}>
          <p className="data-request-text">{t("dataRequest.intro")}</p>

          <div className="data-request-actions">
            {/* Exportación de datos (portabilidad) */}
            <button type="button" className="setup-button" onClick={handleExport} data-testid="data-request-export">
              {t("dataRequest.exportLabel")}
            </button>
            {/* Borrado local de datos + retirada de consentimiento */}
            <button type="button" className="setup-button data-request-erase" onClick={handleErase} data-testid="data-request-erase">
              {t("dataRequest.eraseLabel")}
            </button>
          </div>

          <p className="data-request-note">{t("dataRequest.serverNote")}</p>
        </div>
      </div>
    </div>
  );
});

export default DataRequestModal;
