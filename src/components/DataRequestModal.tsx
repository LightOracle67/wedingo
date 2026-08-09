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
import { useToast } from "../hooks/useToast";
import { useRsvpContext } from "../contexts";
import { eraseGuestLocalData, exportGuestLocalData } from "../lib/data-request";
import Modal from "./Modal";
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
  const { rsvpEntries } = useRsvpContext();

  /** Descarga un JSON con los datos del navegador y las respuestas (portabilidad). */
  const handleExport = () => {
    try {
      const { exported } = exportGuestLocalData(inviteToken);
      const payload = { ...(exported ?? {}), rsvp: rsvpEntries ?? [] };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-datos-${new Date().toISOString().slice(0, 10)}.json`;
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
    // El borrado retira el consentimiento: Sentry debe detenerse.
    import("../lib/sentry").then(({ disableSentryTracking }) => disableSentryTracking());
    addToast("success", t("dataRequest.eraseDone", { count: erasedKeys.length }));
    onClose();
  };

  return (
    <Modal
      title={t("dataRequest.title")}
      closeLabel={t("common.close")}
      onClose={onClose}
      overlayClassName="data-request-modal"
      style={{
        width: "min(95vw, 640px)",
        minWidth: "min(95vw, 360px)",
        maxHeight: "calc(100dvh - 2rem)",
        display: "flex",
        flexDirection: "column",
        padding: "1.2rem 1rem 1rem",
      }}
    >
      <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1, marginTop: "0.5rem", wordBreak: "break-word" }}>
        <p className="data-request-text">{t("dataRequest.intro")}</p>

        <div className="data-request-actions">
          {/* Exportación de datos (portabilidad) */}
          <button type="button" className="setup-button" onClick={handleExport} data-testid="data-request-export">
            {t("dataRequest.exportLabel")}
          </button>
          {/* Borrado local de datos + retirada de consentimiento */}
          <button
            type="button"
            className="setup-button data-request-erase"
            onClick={handleErase}
            data-testid="data-request-erase"
          >
            {t("dataRequest.eraseLabel")}
          </button>
        </div>

        <p className="data-request-note">{t("dataRequest.serverNote")}</p>
      </div>
    </Modal>
  );
});

export default DataRequestModal;
