import { useContext } from "react";
import { ToastContext } from "../contexts/ToastContext";

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
