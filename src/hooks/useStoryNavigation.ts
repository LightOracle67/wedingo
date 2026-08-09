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
// Ratio para CONSIDERAR ENTRADA: cualquier sección que asome un 20% al
// viewport empieza su animación de entrada. Un umbral bajo evita dos
// problemas: secciones invisibles (entre 15% y 70%) que crean huecos en
// blanco al scrollear rápido, y secciones más altas que el viewport (p. ej.
// el RSVP) cuyo ratio máximo nunca alcanzaría un 0.7.
const ENTER_RATIO = 0.2;
// Ratio para CONSIDERAR SALIDA: solo cuando la sección está prácticamente
// fuera (5%) pasa a hidden. Entre ENTER_RATIO y LEAVE_RATIO el estado se
// mantiene (histéresis) para no parpadear por micro-oscilaciones del scroll.
const LEAVE_RATIO = 0.05;

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

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    // Programa una transición: si el estado actual coincide con `from`, lo
    // mueve a `to` tras `ms`. La transición SOLO se programa cuando cambia el
    // estado (lo decide quien llama), así no se reinicia en bucle mientras el
    // IO sigue disparando para la misma sección.
    const schedule = (key: string, from: SectionStage, to: SectionStage, ms: number) => {
      const prev = timers.get(key);
      if (prev) clearTimeout(prev);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          setStages((s) => (s[key] === from ? { ...s, [key]: to } : s));
        }, ms),
      );
    };

    // Al abrir el sobre (enabled pasa de false a true) se vuelve al inicio.
    if (everDisabledRef.current) {
      const scene = document.querySelector<HTMLElement>(".app-scene");
      scene?.scrollTo({ top: 0, behavior: "auto" });
      // ENTRADA SÍNCRONA: la primera sección visible (normalmente el hero)
      // arranca su animación en el MISMO commit en que se revela la
      // invitación. Si se esperase a la primera callback asíncrona del
      // IntersectionObserver (que puede llegar varios frames tarde), el hero
      // aparecería ya renderizado y estático un instante antes de animarse.
      if (!reducedMotion && primarySection) {
        setStages((s) => (s[primarySection] === "entering" ? s : { ...s, [primarySection]: "entering" }));
        schedule(primarySection, "entering", "active", ENTER_MS);
      }
    }

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

          // Ratio de intersección con el viewport (el scroll container es
          // `.app-scene`, que llena la ventana: root null es correcto).
          const ratio = entry.intersectionRatio ?? (entry.isIntersecting ? 1 : 0);
          const isEntered = ratio >= ENTER_RATIO;
          const isGone = ratio <= LEAVE_RATIO;

          if (isEntered) {
            setActiveSection(key);
            if (isFirstContact) {
              // ANTI-PARPADEO + carrera del arranque: en modo "reveal" (sobre
              // recién abierto) la sección principal (hero) entra ANIMADA
              // siempre (el orden de procesado del IO no es garantizado); en
              // modo "boot" (admin/preview) solo anima si es procesada primero
              // para no parpadear al recargar. El resto de secciones al primer
              // contacto se activan SIN animar si ya son visibles.
              const shouldAnimateEntry =
                !reducedMotion && key === primarySection && (bootMode === "reveal" || isGlobalFirst);
              setStages((s) => {
                if (shouldAnimateEntry) {
                  // Solo se anima si no está ya entrando (no reiniciar el timer).
                  if (s[key] === "entering") return s;
                  schedule(key, "entering", "active", ENTER_MS);
                  return { ...s, [key]: "entering" };
                }
                return { ...s, [key]: "active" };
              });
            } else if (reducedMotion) {
              setStages((s) => ({ ...s, [key]: "active" }));
            } else {
              // Reentrada (scroll de vuelta): si estaba oculta o saliendo,
              // arranca la animación de entrada UNA vez.
              setStages((s) => {
                if (s[key] === "entering" || s[key] === "active") return s;
                schedule(key, "entering", "active", ENTER_MS);
                return { ...s, [key]: "entering" };
              });
            }
          } else if (isGone) {
            if (isFirstContact) {
              setStages((s) => ({ ...s, [key]: "hidden" }));
            } else if (reducedMotion) {
              setStages((s) => ({ ...s, [key]: "hidden" }));
            } else {
              setStages((s) => {
                if (s[key] === "entering" || s[key] === "active") {
                  schedule(key, "leaving", "hidden", LEAVE_MS);
                  return { ...s, [key]: "leaving" };
                }
                return s;
              });
            }
          }
        }
      },
      { threshold: [LEAVE_RATIO, ENTER_RATIO] },
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
