/**
 * useStoryNavigation.js
 * Hook de navegación entre secciones de la invitación.
 *
 * COMPORTAMIENTO DE SCROLL:
 * - El scroll avanza EXACTAMENTE una sección por gesto (rueda/teclado),
 *   interceptado aquí: al hacer scroll, la sección siguiente/anterior se
 *   alinea con scrollIntoView suave y se bloquea mientras se asienta.
 * - El SCROLL INTERIOR es independiente: si el gesto ocurre sobre un
 *   elemento con scroll disponible (sección con contenido largo, lista,
 *   etc.), NO se intercepta y se hace scroll interno; solo al llegar al
 *   borde se avanza a la siguiente sección.
 * - La animación de ENTRADA se dispara cuando la sección termina de
 *   asentarse (el observer usa un umbral alto: entra al estar ~70% visible).
 * - La sección principal (primera de visibleOrder) hace su entrada
 *   AUTOMÁTICAMENTE al arrancar (o al abrir el sobre), sin esperar scroll.
 *
 * ESTADOS por sección (autómata para animaciones de entrada/salida):
 *   hidden → entering → active → leaving → hidden
 *
 * ANTI-PARPADEO: el primer contacto de una sección (boot o sección lazy que
 * monta ya visible) la marca activa SIN animar; las demás pasan a hidden y
 * quedan en su posición inicial (CSS) para que la entrada no salte.
 *
 * @param {string[]} visibleOrder - Array ordenado de claves de sección visibles.
 * @param {{ enabled?: boolean, reducedMotion?: boolean }} options
 *   - enabled: false mientras el sobre está cerrado (no se anima ni se
 *     controla el scroll).
 *   - reducedMotion: sin desplazamiento suave y sin estados intermedios.
 * @returns {object} API compatible con PublicInvitation.
 */
import { useEffect, useRef, useState } from "react";

/** Duración (ms) de la animación de entrada, incluido el stagger de los
 *  elementos internos de la card (1200ms de card + hasta 640ms de delay). */
const ENTER_MS = 1450;
/** Duración (ms) de la animación de salida (700ms en CSS + margen). */
const LEAVE_MS = 750;
/** Umbral de visibilidad para considerar la sección "activa" y disparar su
 *  ENTRADA (alto, para que entre justo cuando el scroll se asienta). */
const VISIBILITY_THRESHOLD = 0.7;
/** Acumulación mínima de scroll (px) para avanzar una sección (rueda de
 *  ratón: un notch supera el umbral; trackpad: se acumulan deltas). */
const GESTURE_THRESHOLD = 60;
/** Tiempo de bloqueo tras avanzar una sección (asentado del scroll). */
const SCROLL_LOCK_MS = 950;

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
  // Sección activa accesible desde los listeners (evita closures obsoletos).
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;
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
      stages[sectionKey] === "hidden" ? "story-section--is-hidden" : "",
    ].filter(Boolean).join(" ");

  useEffect(() => {
    // Mientras el sobre está cerrado el contenido está inert: no se observa,
    // ni se anima, ni se controla el scroll (la entrada del hero se dispara
    // al abrir el sobre).
    const enabled = options.enabled ?? true;
    if (!enabled) {
      everDisabledRef.current = true;
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;

    // Primer arranque real del observer = "boot" (anti-parpadeo): las
    // secciones visibles se marcan activas SIN animar, EXCEPTO la sección
    // principal (primera), que hace su entrada automáticamente. Si el
    // contenido estuvo antes deshabilitado (sobre que acaba de abrirse) se
    // usa "reveal": la sección visible hace su ENTRADA animada en ese momento.
    const bootMode = everDisabledRef.current ? "reveal" : "boot";
    const reducedMotion = options.reducedMotion === true;
    const primarySection = visibleOrder[0];

    // Al abrir el sobre (enabled pasa de false a true) el contenido debe
    // comenzar en la sección principal: se resetea el scroll general.
    if (everDisabledRef.current) {
      const scene = document.querySelector<HTMLElement>(".app-scene");
      scene?.scrollTo({ top: 0, behavior: "auto" });
    }

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

    // Elementos de las secciones (para scrollIntoView al avanzar de sección).
    const sectionEls = new Map<string, HTMLElement>();
    const registerSection = (el: HTMLElement) => {
      const key = el.getAttribute("data-story-section");
      if (key) sectionEls.set(key, el);
    };

    let globalFirst = true;
    // Secciones ya "contactadas" por el observer (primer batch global o primer
    // callback de una sección lazy). Su primer contacto NO anima: la sección
    // pasa a active/hidden directamente para no parpadear al cargar/montar.
    const firstContacted = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      const isGlobalFirst = globalFirst;
      globalFirst = false;
      for (const entry of entries) {
        const key = entry.target.getAttribute("data-story-section");
        if (!key) continue;
        const isFirstContact = isGlobalFirst || !firstContacted.has(key);
        if (isFirstContact) firstContacted.add(key);

        // Umbral adaptativo: una sección a pantalla completa "entra" al estar
        // ~70% visible (justo al terminar el scroll); una sección más baja que
        // el viewport (p. ej. la sección de extras) entra con solo asomarse,
        // porque nunca alcanzaría el 70%.
        const ratio = entry.intersectionRatio ?? (entry.isIntersecting ? 1 : 0);
        const isTall = (entry.target as HTMLElement).clientHeight >= window.innerHeight * 0.8;
        const isEntered = isTall ? ratio >= VISIBILITY_THRESHOLD : ratio > 0.1;

        if (isEntered) {
          setActiveSection(key);
          if (isFirstContact) {
            if (isGlobalFirst && !reducedMotion && (bootMode === "reveal" || key === primarySection)) {
              // El hero (sección principal) entra automáticamente al arrancar,
              // y el contenido hace su entrada al abrir el sobre.
              setStages((s) => ({ ...s, [key]: "entering" }));
              schedule(key, "entering", "active", ENTER_MS);
            } else {
              // Primer contacto (boot sobre otra sección o lazy montada):
              // visible y estable, sin parpadeo al cargar la sección.
              setStages((s) => ({ ...s, [key]: "active" }));
            }
          } else if (reducedMotion) {
            setStages((s) => ({ ...s, [key]: "active" }));
          } else {
            // La sección terminó de asentarse: animación de entrada.
            setStages((s) =>
              s[key] === "entering" || s[key] === "active" ? s : { ...s, [key]: "entering" });
            schedule(key, "entering", "active", ENTER_MS);
          }
        } else if (isFirstContact) {
          setStages((s) => ({ ...s, [key]: "hidden" }));
        } else if (reducedMotion) {
          setStages((s) => ({ ...s, [key]: "hidden" }));
        } else {
          // Sale del viewport: animación de salida, luego hidden.
          setStages((s) => {
            if (s[key] === "entering" || s[key] === "active") return { ...s, [key]: "leaving" };
            return s;
          });
          schedule(key, "leaving", "hidden", LEAVE_MS);
        }
      }
    }, { threshold: [0.1, VISIBILITY_THRESHOLD] });

    // ── Control de scroll: una sección por gesto ─────────────────────
    let moving = false;
    let gestureAccum = 0;
    let gestureDir: 1 | -1 | null = null;

    const appScene = document.querySelector<HTMLElement>(".app-scene");

    /** Avanza (1) o retrocede (-1) exactamente una sección. */
    const advance = (dir: 1 | -1) => {
      if (moving) return;
      const currentIndex = visibleOrder.indexOf(activeSectionRef.current);
      const nextIndex = currentIndex + dir;
      if (nextIndex < 0 || nextIndex >= visibleOrder.length) return;
      const nextKey = visibleOrder[nextIndex];
      if (!nextKey) return;
      const target = sectionEls.get(nextKey);
      moving = true;
      if (target) {
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      } else if (appScene) {
        // La sección destino aún no está montada (lazy en proceso de carga):
        // se avanza el scroll general una pantalla para que se monte al
        // acercarse; en el siguiente gesto ya existirá el elemento.
        appScene.scrollBy({ top: dir * window.innerHeight, behavior: reducedMotion ? "auto" : "smooth" });
      }
      setTimeout(() => { moving = false; }, SCROLL_LOCK_MS);
    };

    /** ¿El gesto ocurre sobre un contenedor con scroll interior utilizable?
     *  Recorre el árbol desde el objetivo hasta el contenedor general
     *  (.app-scene): el primer contenedor scrolleable que no está en su
     *  borde se queda con el gesto (el scroll general no debe avanzar de
     *  sección mientras haya contenido interior desplazable). */
    const hasInnerScroll = (target: EventTarget | null, dir: 1 | -1): boolean => {
      let node = target instanceof HTMLElement ? target : null;
      while (node && node !== document.body && node !== appScene) {
        if (node.scrollHeight > node.clientHeight + 2) {
          const atEdge = dir === 1
            ? node.scrollTop + node.clientHeight >= node.scrollHeight - 2
            : node.scrollTop <= 2;
          return !atEdge;
        }
        node = node.parentElement;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      if (Math.abs(e.deltaY) < 1) return;
      // Scroll interior disponible: no interceptar (el contenido interno se
      // desplaza; solo al llegar a su borde se avanza de sección).
      if (hasInnerScroll(e.target, dir)) {
        gestureAccum = 0;
        gestureDir = null;
        return;
      }
      // Sin sección siguiente/anterior (bordes o secciones sociales al final):
      // se deja el scroll general nativo para poder ver ese contenido.
      const currentIndex = visibleOrder.indexOf(activeSectionRef.current);
      const nextIndex = currentIndex + dir;
      if (nextIndex < 0 || nextIndex >= visibleOrder.length) return;
      e.preventDefault();
      if (moving) return;
      // Acumula el gesto (un notch de rueda supera el umbral; un trackpad
      // acumula deltas pequeños hasta completar un gesto).
      if (gestureDir !== null && gestureDir !== dir) { gestureAccum = 0; }
      gestureDir = dir;
      gestureAccum += Math.abs(e.deltaY);
      if (gestureAccum < GESTURE_THRESHOLD) return;
      gestureAccum = 0;
      advance(dir);
    };

    const isTyping = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      return !!n && (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.isContentEditable);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const dirMap: Record<string, 1 | -1> = {
        PageDown: 1, ArrowDown: 1, ArrowRight: 1, " ": 1,
        PageUp: -1, ArrowUp: -1, ArrowLeft: -1, Home: -1,
      };
      if (e.key === "End") {
        e.preventDefault();
        const lastKey = visibleOrder[visibleOrder.length - 1];
        if (!lastKey) return;
        const last = sectionEls.get(lastKey);
        if (moving) return;
        if (last) {
          last.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        } else if (appScene) {
          appScene.scrollTo({ top: appScene.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
        }
        return;
      }
      const dir = dirMap[e.key];
      if (dir === undefined) return;
      // Sin sección a la que avanzar: no interceptar (scroll nativo).
      const currentIndex = visibleOrder.indexOf(activeSectionRef.current);
      const nextIndex = currentIndex + dir;
      if (nextIndex < 0 || nextIndex >= visibleOrder.length) return;
      e.preventDefault();
      advance(dir);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    // ── Observación de secciones (incluidas las lazy montadas después) ──
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      const observed = new Set<HTMLElement>();
      mutationObserver = new MutationObserver(() => {
        const unobserved = Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]"))
          .filter((el) => !observed.has(el));
        for (const el of unobserved) {
          observed.add(el);
          registerSection(el);
          observer.observe(el);
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    const observed = new Set<HTMLElement>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]"));
    for (const s of sections) {
      observed.add(s);
      registerSection(s);
      observer.observe(s);
    }
    return () => {
      observer.disconnect();
      mutationObserver?.disconnect();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [orderKey, visibleOrder, options.enabled, options.reducedMotion]);

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
