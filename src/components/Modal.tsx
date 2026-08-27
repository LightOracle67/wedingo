import { memo, useCallback, useState, type ReactNode, type CSSProperties } from "react";
import { useFocusTrap, useInertBackground, useEscapeKey } from "../hooks/useFocusTrap";
import "../styles/modals.css";

interface ModalProps {
  /** Título accesible del diálogo (aria-label) y cabecera visible. */
  title: string;
  /** Cierra el modal (el componente gestiona la animación de salida). */
  onClose: () => void;
  /** Texto del botón de cierre (aria-label). */
  closeLabel: string;
  children: ReactNode;
  /** Estilos del panel (ancho, alto, padding, flex...). */
  style?: CSSProperties;
  /** Clase extra para el overlay (p. ej. para tests). */
  overlayClassName?: string;
  /** Si es true, el título se oculta pero se mantiene el aria-label. */
  hideTitle?: boolean;
}

/**
 * Modal — Overlay + panel + botón de cierre + focus-trap + Escape + animación
 * de salida. Centraliza el patrón que antes se duplicaba en AccessibilityPanel,
 * ChangelogModal, LegalModal, DataRequestModal y LanguageSwitcher: la
 * semántica ARIA y el comportamiento de teclado convergen en un único punto.
 */
const Modal = memo(function Modal({
  title,
  onClose,
  closeLabel,
  children,
  style,
  overlayClassName,
  hideTitle,
}: ModalProps) {
  const [closing, setClosing] = useState(false);
  const modalRef = useFocusTrap<HTMLDivElement>(true);
  // Mientras el modal está abierto, el resto del documento queda `inert`:
  // el lector de pantalla y el cursor virtual ya no leen el fondo (WCAG 1.3.1).
  useInertBackground(true, modalRef);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEscapeKey(handleClose, true);

  return (
    <div
      className={`modal-overlay ${closing ? "modal-overlay--closing" : ""} ${overlayClassName || ""}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`modal-card ${closing ? "modal-card--closing" : ""}`}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={style}
      >
        <button className="modal-close" onClick={handleClose} aria-label={closeLabel}>
          &times;
        </button>
        {!hideTitle ? <p className="modal-title">{title}</p> : null}
        {/*
          El cuerpo scrolleable vive en su propia región enfocable: con el scroll
          confinado aquí, el botón de cierre y el título permanecen fijos, y el
          área es navegable por teclado (WCAG 2.1.1) ya que el foco puede entrar
          en ella con Tab.
        */}
        <div className="modal-body" role="region" aria-label={title} tabIndex={0}>
          {children}
        </div>
      </div>
    </div>
  );
});

export default Modal;
