import { createContext, useContext, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/** Contexto de React para el sistema de notificaciones toast. */
const ToastContext = createContext(null);

/** Contador global para IDs únicos de toast. */
let toastId = 0;

/**
 * Componente interno del proveedor de toasts.
 * Gestiona la cola de notificaciones, el cierre automático
 * y la animación de salida (fade-out).
 *
 * @param {{ children: React.ReactNode, containerId?: string, t: Function }} props
 * @returns {JSX.Element} Provider con el portal de toasts.
 */
function ToastProviderInner({ children, containerId = "toast-root", t }) {
  const [toasts, setToasts] = useState([]);
  /** Almacena los timers de auto-cierre por ID de toast. */
  const timersRef = useRef({});

  /**
   * Elimina un toast de la cola y limpia su timer.
   *
   * @param {number} id - ID del toast a eliminar.
   */
  const remove = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Programa el cierre automático de un toast tras `delay` ms.
   * Inicia la animación de salida (exiting) y luego lo elimina.
   *
   * @param {number} id - ID del toast.
   * @param {number} delay - Milisegundos antes de iniciar el cierre.
   */
  const scheduleDismiss = useCallback((id, delay) => {
    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast))
      );
      setTimeout(() => remove(id), 300);
    }, delay);
  }, [remove]);

  /**
   * Añade un toast simple (success, error, warning).
   *
   * @param {string} type - Tipo de toast: "success", "error" o "warning".
   * @param {string} message - Texto del toast.
   * @param {number} [duration=5000] - Duración en ms antes del cierre automático.
   * @returns {number} ID del toast creado.
   */
  const addToast = useCallback((type, message, duration = 5000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message, exiting: false }]);
    scheduleDismiss(id, duration);
    return id;
  }, [scheduleDismiss]);

  /**
   * Inicia un toast con barra de progreso para operaciones largas
   * (subida de archivos, procesamiento, etc.).
   *
   * Devuelve un objeto con tres métodos:
   * - `update(percent)` → actualiza la barra de progreso (0–100).
   * - `complete(message)` → marca la operación como exitosa y cierra el toast.
   * - `error(message)` → marca el error y cierra el toast tras 6s.
   *
   * @param {string} message - Texto inicial del toast.
   * @returns {{ update: Function, complete: Function, error: Function }}
   */
  const startUploadToast = useCallback((message) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type: "progress", message, progress: 0, exiting: false }]);

    /** Actualiza el porcentaje de la barra de progreso (0–100). */
    const update = (percent) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, progress: Math.min(100, Math.max(0, Math.round(percent))) } : t))
      );
    };

    /** Marca la operación como completada y cierra el toast a los 3s. */
    const complete = (msg) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, type: "success", message: msg, progress: 100 } : t))
      );
      scheduleDismiss(id, 3000);
    };

    /** Marca la operación como fallida y cierra el toast a los 6s. */
    const error = (msg) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, type: "error", message: msg, progress: t.progress } : t))
      );
      scheduleDismiss(id, 6000);
    };

    return { update, complete, error };
  }, [scheduleDismiss]);

  /** Valor expuesto por el contexto. */
  const value = { addToast, startUploadToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div id={containerId} className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}${toast.exiting ? " toast--exiting" : ""}`}
            role="alert"
          >
            <span className="toast__icon">
              {toast.type === "success" ? "✓" : toast.type === "warning" ? "!" : toast.type === "progress" ? "↑" : "✕"}
            </span>
            <div className="toast__body">
              <span className="toast__text">{toast.message}</span>
              {toast.type === "progress" && (
                <div className="toast__progress-track" role="progressbar" aria-valuenow={toast.progress} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="toast__progress-bar"
                    style={{ width: `${toast.progress}%` }}
                  />
                </div>
              )}
            </div>
            <button className="toast__close" onClick={() => remove(toast.id)} aria-label={t("common.toast.close")}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function ToastProvider(props) {
  const { t } = useTranslation();
  return <ToastProviderInner {...props} t={t} />;
}

/**
 * Hook para acceder al sistema de toasts desde cualquier componente.
 *
 * @returns {{ addToast: Function, startUploadToast: Function }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
