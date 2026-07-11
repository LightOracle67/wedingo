import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(open) {
  const ref = useRef(null);
  const prevRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    prevRef.current = document.activeElement;
    const el = ref.current;
    if (!el) return;
    const focusable = el.querySelectorAll(FOCUSABLE);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleKey = (e) => {
      if (e.key === "Tab") {
        const current = el.querySelectorAll(FOCUSABLE);
        const f = current[0];
        const l = current[current.length - 1];
        if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l?.focus(); }
        else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f?.focus(); }
      }
    };
    el.addEventListener("keydown", handleKey);
    return () => {
      el.removeEventListener("keydown", handleKey);
      prevRef.current?.focus();
    };
  }, [open]);

  return ref;
}

/**
 * Hook que ejecuta un callback al pulsar Escape.
 * @param {function} onEscape - Callback a ejecutar.
 * @param {boolean} [enabled=true] - Si el hook está activo.
 */
export function useEscapeKey(onEscape, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handleKey = (e) => { if (e.key === "Escape") onEscape(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onEscape, enabled]);
}
