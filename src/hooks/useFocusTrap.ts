import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trampa de foco robusta (WCAG 2.4.3) para modales/diálogos:
 *  - Mueve el foco al PRIMER elemento enfocable (o al propio contenedor si no
 *    hay ninguno, tabindex=-1) al abrir.
 *  - Intercepta Tab/Shift+Tab en `document` (no solo en el contenedor): si el
 *    foco sale del modal por foco programático, la trampa sigue actuando.
 *  - Restaura el foco al elemento que abrió el modal al cerrarse.
 *  - Ignora el atajo si hay OTRO `[aria-modal]` más profundo abierto encima
 *    (evita que dos trampas peleen por el Tab).
 *
 * @param {boolean} open - Si la trampa está activa.
 * @returns {React.RefObject<T|null>} Ref que apunta al contenedor del modal.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(open: boolean) {
  const ref = useRef<T | null>(null);
  const prevRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    // Se captura el abridor SOLO si no hay ya un modal abierto y VISIBLE
    // encima (que no sea el propio `el`, ni overlays ocultos como el menú de
    // navegación que está permanentemente en el DOM con aria-modal). Sin el
    // filtro de visibilidad, el foco volvía a un overlay oculto y se perdía
    // la posición del usuario al cerrar (WCAG 2.4.3/2.4.7).
    const others = Array.from(document.querySelectorAll("[aria-modal='true']")).filter(
      (m) => m !== el && (m as HTMLElement).getClientRects().length > 0,
    );
    if (others.length > 0) {
      prevRef.current = others[others.length - 1] ?? null;
    } else {
      prevRef.current = document.activeElement;
    }
    if (!el) return;

    const focusable = el.querySelectorAll(FOCUSABLE);
    const first = focusable[0] as HTMLElement | undefined;
    if (first) {
      first.focus();
    } else {
      // Sin elementos enfocables: el propio contenedor recibe el foco
      // (tabindex="-1") para que el Tab no se escape al fondo de la página.
      el.tabIndex = -1;
      el.focus();
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      // Si hay un modal ABIERTO ENCIMA de este (estado transient de doble
      // modal), no robar su Tab.
      const openAbove = Array.from(document.querySelectorAll("[aria-modal='true']"))
        .some((m) => m !== el && el.contains(m));
      if (openAbove) return;
      const current = el.querySelectorAll(FOCUSABLE);
      const f = current[0];
      const l = current[current.length - 1];
      if (!f || !l) return;
      const active = document.activeElement;
      // Solo intercepta si el foco está DENTRO del contenedor (o fuera, en el
      // resto del documento, lo que equivale a "escapó" del modal).
      if (e.shiftKey && (!el.contains(active) || active === f)) {
        e.preventDefault();
        (l as HTMLElement).focus();
      } else if (!e.shiftKey && (!el.contains(active) || active === l)) {
        e.preventDefault();
        (f as HTMLElement).focus();
      }
    };
    // Listener en document: también recupera el foco si el usuario lo movió
    // fuera del contenedor por otros medios.
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      (prevRef.current as HTMLElement)?.focus?.();
    };
  }, [open]);

  return ref;
}

/**
 * Aplica `inert` (y `aria-hidden` como respaldo) a todo el contenido del
 * documento EXCEPTO el elemento dado, para que el lector de pantalla y el
 * cursor virtual no lean el fondo mientras un modal está abierto (WCAG 1.3.1).
 * Se restaura al desmontar.
 *
 * @param {boolean} open - Si el resto del árbol debe quedar inerte.
 * @param {React.RefObject<HTMLElement|null>} keepRef - Ref del modal que permanece activo.
 */
export function useInertBackground<T extends HTMLElement = HTMLElement>(open: boolean, keepRef: React.RefObject<T | null>) {
  useEffect(() => {
    if (!open) return;
    const keep = keepRef.current;
    if (!keep) return;
    const root = document.getElementById("root");
    if (!root) return;
    // Aislar el contenedor del modal de sus hermanos dentro de #root.
    const inerted: { el: HTMLElement; prevInert: boolean }[] = [];
    for (const child of Array.from(root.children)) {
      const el = child as HTMLElement;
      if (el === keep || el.contains(keep) || keep.contains(el)) continue;
      inerted.push({ el, prevInert: el.inert });
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
    }
    return () => {
      for (const { el, prevInert } of inerted) {
        el.inert = prevInert;
        el.removeAttribute("aria-hidden");
      }
    };
  }, [open, keepRef]);
}

/**
 * Hook que ejecuta un callback al pulsar Escape.
 * @param {function} onEscape - Callback a ejecutar.
 * @param {boolean} [enabled=true] - Si el hook está activo.
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onEscape, enabled]);
}
