/**
 * useStoryNavigation.js
 * Hook de navegación entre secciones de la invitación.
 *
 * La navegación se hace mediante CSS scroll-snap. Este hook añade el
 * seguimiento de la sección VISIBLE con IntersectionObserver para aplicar
 * la clase `story-section--is-active` (indicador de posición, animaciones de
 * entrada y variantes compactas de detalles/RSVP).
 *
 * @param {string[]} visibleOrder - Array ordenado de claves de sección visibles.
 * @returns {object} API compatible con PublicInvitation.
 */
import { useEffect, useState } from "react";

/** Estilo vacío compartido: misma referencia en cada render para no romper
 *  el React.memo de las secciones (un objeto nuevo por tick re-renderizaba
 *  toda la invitación una vez por segundo con el countdown). */
const EMPTY_STYLE: Record<string, string> = {};

export function useStoryNavigation(visibleOrder: string[]) {
  const [activeSection, setActiveSection] = useState<string>(visibleOrder[0] || "hero");
  const orderKey = visibleOrder.join(",");

  // Observa las secciones montadas y marca como activa la que está en el
  // viewport (el snap hace que sea una cada vez). Un MutationObserver re-observa
  // las secciones lazy que montan DESPUÉS (React.lazy/Suspense), que de otro
  // modo nunca recibirían la clase --is-active.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const key = entry.target.getAttribute("data-story-section");
          if (key) setActiveSection(key);
        }
      }
    }, { threshold: 0.5 });

    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        const unobserved = Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]"))
          .filter((el) => !observed.has(el));
        for (const el of unobserved) {
          observed.add(el);
          observer.observe(el);
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    const observed = new Set<HTMLElement>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]"));
    for (const s of sections) {
      observed.add(s);
      observer.observe(s);
    }
    return () => {
      observer.disconnect();
      mutationObserver?.disconnect();
    };
  }, [orderKey]);

  const getSectionStyle = (_sectionKey?: string) => EMPTY_STYLE;
  const getSectionClassName = (sectionKey: string) =>
    ["story-section", `story-section--${sectionKey}`, sectionKey === activeSection ? "story-section--is-active" : ""]
      .filter(Boolean)
      .join(" ");

  return {
    activeSection,
    transition: { fromIndex: 0, toIndex: null, direction: 1 },
    isTransitioning: false,
    getSectionStyle,
    getSectionClassName,
    startTransition: (_index?: number) => {},
  };
}
