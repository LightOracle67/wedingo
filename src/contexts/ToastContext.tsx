import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ToastContext } from "../hooks/useToast";
import "../styles/toast.css";

/** Contador global para IDs únicos de toast. */
let toastId = 0;

interface Toast {
  id: number;
  type: string;
  message: string;
  exiting: boolean;
  progress?: number;
}

interface UploadToastControls {
  update: (percent: number) => void;
  complete: (msg: string) => void;
  error: (msg: string) => void;
}

function ToastProviderInner({ children, containerId = "toast-root", t }: { children: React.ReactNode; containerId?: string; t: (key: string) => string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const remove = useCallback((id: number) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback((id: number, delay: number) => {
    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast))
      );
      setTimeout(() => remove(id), 300);
    }, delay);
  }, [remove]);

  const addToast = useCallback((type: string, message: string, duration = 5000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message, exiting: false }]);
    scheduleDismiss(id, duration);
    return id;
  }, [scheduleDismiss]);

  const startUploadToast = useCallback((message: string): UploadToastControls => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type: "progress", message, progress: 0, exiting: false }]);

    const update = (percent: number) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, progress: Math.min(100, Math.max(0, Math.round(percent))) } : t))
      );
    };

    const complete = (msg: string) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, type: "success", message: msg, progress: 100 } : t))
      );
      scheduleDismiss(id, 3000);
    };

    const error = (msg: string) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, type: "error", message: msg, progress: t.progress } : t))
      );
      scheduleDismiss(id, 6000);
    };

    return { update, complete, error };
  }, [scheduleDismiss]);

  const value = { addToast, startUploadToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div id={containerId} className="toast-container" role="status" aria-live="polite">
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

export function ToastProvider(props: { children: React.ReactNode; containerId?: string }) {
  const { t } = useTranslation();
  return <ToastProviderInner {...props} t={t} />;
}
