/**
 * useStoryNavigation — Animaciones de sección VINCULADAS AL SCROLL libre.
 *
 * El usuario hace scroll NORMAL (arriba/abajo) por toda la invitación: las
 * secciones se apilan verticalmente y el documento/`.app-scene` se desplaza
 * libremente (sin snap por sección, sin interceptar la rueda ni el teclado).
 * Un IntersectionObserver detecta qué sección entra/sale del viewport y
 * gestiona su animación de entrada (3D + stagger) y de salida (fade + escala).
 *
 * ESTADOS por sección: hidden → entering → active → leaving → hidden.
 * - hidden: en reposo, invisible (visibility:hidden) pero OCUPANDO su espacio;
 *   así la entrada anima sin salto y el scroll conserva la altura total.
 * - entering: animación de entrada al asomarse al viewport.
 * - active: visible y estable.
 * - leaving: animación de salida al abandonar el viewport.
 *
 * ANTI-PARPADEO: el primer contacto de una sección (boot o lazy que monta ya
 * visible) la marca activa SIN animar; el hero (primera) entra automáticamente.
 *
 * @param {string[]} visibleOrder - Claves de sección visibles en orden.
 * @param {{ enabled?: boolean, reducedMotion?: boolean }} options
 * @returns {{ getSectionStyle, getSectionClassName }}
 */
import { useEffect, useRef, useState } from "react";

const ENTER_MS = 1550;
const LEAVE_MS = 1150;
const VISIBILITY_THRESHOLD = 0.7;

type SectionStage = "hidden" | "entering" | "active" | "leaving";

const EMPTY_STYLE: Record<string, string> = {};

export function useStoryNavigation(
  visibleOrder: string[],
  options: { enabled?: boolean; reducedMotion?: boolean } = {},
) {
  const [activeSection, setActiveSection] = useState<string>(visibleOrder[0] || "hero");
  const [stages, setStages] = useState<Record<string, SectionStage>>({});
  const everDisabledRef = useRef(false);
  const orderKey = visibleOrder.join(",");

  const getSectionClassName = (sectionKey: string) =>
    [
      "story-section",
      `story-section--${sectionKey}`,
      sectionKey === activeSection ? "story-section--is-active" : "",
      stages[sectionKey] === "entering" ? "story-section--is-enter" : "",
      stages[sectionKey] === "leaving" ? "story-section--is-leave" : "",
      stages[sectionKey] === "hidden" ? "story-section--is-hidden" : "",
    ]
      .filter(Boolean)
      .join(" ");

  useEffect(() => {
    const enabled = options.enabled ?? true;
    if (!enabled) {
      everDisabledRef.current = true;
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;

    const bootMode = everDisabledRef.current ? "reveal" : "boot";
    const reducedMotion = options.reducedMotion === true;
    const primarySection = visibleOrder[0];

    // Al abrir el sobre (enabled pasa de false a true) se vuelve al inicio.
    if (everDisabledRef.current) {
      const scene = document.querySelector<HTMLElement>(".app-scene");
      scene?.scrollTo({ top: 0, behavior: "auto" });
    }

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const schedule = (key: string, from: SectionStage, to: SectionStage, ms: number) => {
      const prev = timers.get(key);
      if (prev) clearTimeout(prev);
      timers.set(
        key,
        setTimeout(() => {
          setStages((s) => (s[key] === from ? { ...s, [key]: to } : s));
        }, ms),
      );
    };

    let globalFirst = true;
    const firstContacted = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        const isGlobalFirst = globalFirst;
        globalFirst = false;
        for (const entry of entries) {
          const key = entry.target.getAttribute("data-story-section");
          if (!key) continue;
          const isFirstContact = isGlobalFirst || !firstContacted.has(key);
          if (isFirstContact) firstContacted.add(key);

          // Umbral adaptativo: una sección a pantalla completa "entra" al estar
          // ~70% visible; una sección más baja que el viewport entra al asomarse.
          // El umbral de SALIDA es más bajo (0.15) que el de entrada para no
          // reiniciar la animación por micro-oscilaciones del scroll.
          const ratio = entry.intersectionRatio ?? (entry.isIntersecting ? 1 : 0);
          const isTall = (entry.target as HTMLElement).clientHeight >= window.innerHeight * 0.8;
          const enteredThreshold = isTall ? VISIBILITY_THRESHOLD : 0.1;
          const isEntered = ratio >= enteredThreshold;
          const isGone = ratio <= 0.15;

          if (isEntered) {
            setActiveSection(key);
            if (isFirstContact) {
              if (isGlobalFirst && !reducedMotion && (bootMode === "reveal" || key === primarySection)) {
                setStages((s) => ({ ...s, [key]: "entering" }));
                schedule(key, "entering", "active", ENTER_MS);
              } else {
                setStages((s) => ({ ...s, [key]: "active" }));
              }
            } else if (reducedMotion) {
              setStages((s) => ({ ...s, [key]: "active" }));
            } else {
              setStages((s) => (s[key] === "entering" || s[key] === "active" ? s : { ...s, [key]: "entering" }));
              schedule(key, "entering", "active", ENTER_MS);
            }
          } else if (isGone) {
            if (isFirstContact) {
              setStages((s) => ({ ...s, [key]: "hidden" }));
            } else if (reducedMotion) {
              setStages((s) => ({ ...s, [key]: "hidden" }));
            } else {
              setStages((s) => {
                if (s[key] === "entering" || s[key] === "active") return { ...s, [key]: "leaving" };
                return s;
              });
              schedule(key, "leaving", "hidden", LEAVE_MS);
            }
          }
        }
      },
      { threshold: [0.1, 0.15, VISIBILITY_THRESHOLD] },
    );

    const observed = new Set<HTMLElement>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]"));
    for (const s of sections) {
      observed.add(s);
      observer.observe(s);
    }

    // Observa también las secciones lazy que montan después.
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        const unobserved = Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]")).filter(
          (el) => !observed.has(el),
        );
        for (const el of unobserved) {
          observed.add(el);
          observer.observe(el);
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      mutationObserver?.disconnect();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [orderKey, visibleOrder, options.enabled, options.reducedMotion]);

  const getSectionStyle = (_sectionKey?: string) => EMPTY_STYLE;

  return {
    getSectionStyle,
    getSectionClassName,
  };
}
