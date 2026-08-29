import { type Ref } from "react";
import { useTranslation } from "react-i18next";

/** Props del modal de vídeo de bienvenida. */
export interface WelcomeVideoModalProps {
  /** Controla si el modal está visible (sobre abierto + vídeo mostrándose). */
  show: boolean;
  /** Fase de salida: mantiene el modal montado para que el fade no se corte. */
  closing: boolean;
  /** URL del vídeo a reproducir. */
  src: string;
  /** Ref del contenedor del overlay (usada por el foco del modal). */
  overlayRef?: Ref<HTMLDivElement>;
  /** Cierra el modal. */
  onClose: () => void;
}

/**
 * Modal de vídeo de bienvenida que se abre tras abrir el sobre.
 *
 * Subcomponente de presentación puro: la visibilidad y la fase de salida se
 * deciden desde PublicInvitation (estado showWelcomeVideo/videoClosing), que
 * también gestiona el foco. Aquí solo se renderiza el overlay accesible
 * (dialog + aria-modal) con el vídeo en autoplay, separado del monolítico
 * para poder testearlo de forma aislada.
 */
export default function WelcomeVideoModal({ show, closing, src, overlayRef, onClose }: WelcomeVideoModalProps) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <div
      ref={overlayRef}
      className={`welcome-video-overlay ${closing ? "welcome-video-overlay--closing" : ""}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("welcomeVideo.title")}
    >
      <div
        className={`welcome-video-card ${closing ? "welcome-video-card--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t("common.close")}>
          &times;
        </button>
        <video className="welcome-video" src={src} controls autoPlay playsInline />
      </div>
    </div>
  );
}
