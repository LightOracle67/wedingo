import { createContext, useContext } from "react";

export const ToastContext = createContext<any>(null);

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
