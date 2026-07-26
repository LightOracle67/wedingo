import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement = HTMLElement>(open: boolean) {
  const ref = useRef<T | null>(null);
  const prevRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    prevRef.current = document.activeElement;
    const el = ref.current;
    if (!el) return;
    const focusable = el.querySelectorAll(FOCUSABLE);
    const first = focusable[0];
    (first as HTMLElement)?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const current = el.querySelectorAll(FOCUSABLE);
        const f = current[0];
        const l = current[current.length - 1];
        if (e.shiftKey && document.activeElement === f) { e.preventDefault(); (l as HTMLElement)?.focus(); }
        else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); (f as HTMLElement)?.focus(); }
      }
    };
    el.addEventListener("keydown", handleKey);
    return () => {
      el.removeEventListener("keydown", handleKey);
      (prevRef.current as HTMLElement)?.focus();
    };
  }, [open]);

  return ref;
}

/**
 * Hook que ejecuta un callback al pulsar Escape.
 * @param {function} onEscape - Callback a ejecutar.
 * @param {boolean} [enabled=true] - Si el hook está activo.
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onEscape(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onEscape, enabled]);
}
