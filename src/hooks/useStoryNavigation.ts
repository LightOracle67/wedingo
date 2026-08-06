/**
 * useStoryNavigation.js
 * Hook de navegación entre secciones de la invitación.
 *
 * La navegación se hace mediante CSS scroll-snap. Este hook añade el
 * seguimiento de la sección VISIBLE con IntersectionObserver y gestiona un
 * pequeño autómata de estados por sección para las animaciones de ENTRADA y
 * SALIDA:
 *
 *   hidden → entering → active → leaving → hidden
 *
 * - "entering": la sección entra al viewport por scroll (animación de entrada
 *   con stagger en los elementos de la card).
 * - "active": estado estable, contenido visible sin animación.
 * - "leaving": la sección abandona el viewport (fade + scale suave).
 * - "hidden": fuera de viewport, lista para el siguiente snap.
 *
 * ANTI-PARPADEO A LA RECARGA: el primer arranque del observer ("boot") marca
 * las secciones ya visibles como "active" SIN animación, de modo que recargar
 * o restaurar el scroll del navegador no reproduce la animación de entrada
 * (que haría parpadear el contenido). Cuando el sobre se abre (enabled pasa
 * de false a true) se usa el modo "reveal": la sección visible hace su
 * animación de ENTRADA en ese momento.
 *
 * @param {string[]} visibleOrder - Array ordenado de claves de sección visibles.
 * @param {{ enabled?: boolean, reducedMotion?: boolean }} options
 *   - enabled: false mientras el sobre está cerrado (no se anima nada).
 *   - reducedMotion: salta los estados intermedios (accesibilidad).
 * @returns {object} API compatible con PublicInvitation.
 */
import { useEffect, useRef, useState } from "react";

/** Duración (ms) de la animación de entrada, incluido el stagger de los
 *  elementos internos de la card (850ms en CSS). */
const ENTER_MS = 900;
/** Duración (ms) de la animación de salida (480ms en CSS + margen). */
const LEAVE_MS = 560;
/** Fracción mínima de la sección visible para considerarla "activa". */
const VISIBILITY_THRESHOLD = 0.35;

type SectionStage = "hidden" | "entering" | "active" | "leaving";

/** Estilo vacío compartido: misma referencia en cada render para no romper
 *  el React.memo de las secciones (un objeto nuevo por tick re-renderizaba
 *  toda la invitación una vez por segundo con el countdown). */
const EMPTY_STYLE: Record<string, string> = {};

export function useStoryNavigation(
  visibleOrder: string[],
  options: { enabled?: boolean; reducedMotion?: boolean } = {},
) {
  const [activeSection, setActiveSection] = useState<string>(visibleOrder[0] || "hero");
  const [stages, setStages] = useState<Record<string, SectionStage>>({});
  // true si el contenido estuvo deshabilitado (sobre cerrado) antes del
  // primer arranque real del observer: distingue el "boot" inicial
  // (anti-parpadeo) del "reveal" al abrir el sobre (entrada animada).
  const everDisabledRef = useRef(false);
  const orderKey = visibleOrder.join(",");

  const getSectionClassName = (sectionKey: string) =>
    [
      "story-section",
      `story-section--${sectionKey}`,
      sectionKey === activeSection ? "story-section--is-active" : "",
      stages[sectionKey] === "entering" ? "story-section--is-enter" : "",
      stages[sectionKey] === "leaving" ? "story-section--is-leave" : "",
    ].filter(Boolean).join(" ");

  useEffect(() => {
    // Mientras el sobre está cerrado el contenido está inert: no se observa
    // ni se anima nada (la entrada del hero se dispara al abrir el sobre).
    const enabled = options.enabled ?? true;
    if (!enabled) {
      everDisabledRef.current = true;
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;

    // Primer arranque real del observer = "boot" (anti-parpadeo): las
    // secciones visibles se marcan activas SIN animar. Si el contenido estuvo
    // antes deshabilitado (sobre cerrado que acaba de abrirse) se usa
    // "reveal": la sección visible hace su ENTRADA animada en ese momento.
    const bootMode = everDisabledRef.current ? "reveal" : "boot";
    const reducedMotion = options.reducedMotion === true;

    // Temporizadores de promoción de estado por sección (entering→active y
    // leaving→hidden), para no depender de animationend (el stagger CSS).
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const schedule = (key: string, from: SectionStage, to: SectionStage, ms: number) => {
      const prev = timers.get(key);
      if (prev) clearTimeout(prev);
      timers.set(key, setTimeout(() => {
        // Solo promueve si el estado no cambió a otro intermedio mientras
        // tanto (p. ej. el usuario volvió a la sección).
        setStages((s) => (s[key] === from ? { ...s, [key]: to } : s));
      }, ms));
    };

    let firstCallback = true;
    const observer = new IntersectionObserver((entries) => {
      if (firstCallback) {
        firstCallback = false;
        // Primer batch: todas las secciones observadas notifican su estado.
        for (const entry of entries) {
          const key = entry.target.getAttribute("data-story-section");
          if (!key) continue;
          if (entry.isIntersecting) {
            setActiveSection(key);
            if (bootMode === "reveal" && !reducedMotion) {
              // El sobre acaba de abrirse: el contenido visible entra animado.
              setStages((s) => ({ ...s, [key]: "entering" }));
              schedule(key, "entering", "active", ENTER_MS);
            } else {
              // Boot inicial o reduced motion: visible y estable, sin parpadeo.
              setStages((s) => ({ ...s, [key]: "active" }));
            }
          } else {
            setStages((s) => ({ ...s, [key]: "hidden" }));
          }
        }
        return;
      }
      // Callbacks posteriores (scroll): entrada y salida animadas.
      for (const entry of entries) {
        const key = entry.target.getAttribute("data-story-section");
        if (!key) continue;
        if (entry.isIntersecting) {
          setActiveSection(key);
          if (reducedMotion) {
            setStages((s) => ({ ...s, [key]: "active" }));
          } else {
            setStages((s) =>
              s[key] === "entering" || s[key] === "active" ? s : { ...s, [key]: "entering" });
            schedule(key, "entering", "active", ENTER_MS);
          }
        } else if (!reducedMotion) {
          // Sale del viewport: animación de salida, luego hidden.
          setStages((s) => {
            if (s[key] === "entering" || s[key] === "active") return { ...s, [key]: "leaving" };
            return s;
          });
          schedule(key, "leaving", "hidden", LEAVE_MS);
        } else {
          setStages((s) => ({ ...s, [key]: "hidden" }));
        }
      }
    }, { threshold: VISIBILITY_THRESHOLD });

    // Re-observa las secciones lazy que montan DESPUÉS (React.lazy/Suspense).
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      const observed = new Set<HTMLElement>();
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
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [orderKey, options.enabled, options.reducedMotion]);

  const getSectionStyle = (_sectionKey?: string) => EMPTY_STYLE;

  return {
    activeSection,
    transition: { fromIndex: 0, toIndex: null, direction: 1 },
    isTransitioning: false,
    getSectionStyle,
    getSectionClassName,
    startTransition: (_index?: number) => {},
  };
}
