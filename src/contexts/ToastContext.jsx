import { createContext, useContext, useCallback, useRef, useState } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children, containerId = "toast-root" }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const remove = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = 5000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message, exiting: false }]);
    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => remove(id), 300);
    }, duration);
    return id;
  }, [remove]);

  const value = { addToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div id={containerId} className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.type}${t.exiting ? " toast--exiting" : ""}`}
            role="alert"
          >
            <span className="toast__icon">
              {t.type === "success" ? "✓" : t.type === "warning" ? "!" : "✕"}
            </span>
            <span className="toast__text">{t.message}</span>
            <button className="toast__close" onClick={() => remove(t.id)} aria-label="Cerrar">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
