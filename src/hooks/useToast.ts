import { createContext, useContext } from "react";

export interface UploadToastControls {
  update: (percent: number) => void;
  complete: (msg: string) => void;
  error: (msg: string) => void;
}

interface ToastContextValue {
  addToast: (type: string, message: string, duration?: number) => number;
  startUploadToast: (message: string) => UploadToastControls;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook para acceder al sistema de toasts desde cualquier componente.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
