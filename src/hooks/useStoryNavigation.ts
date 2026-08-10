/**
 * useStoryNavigation — Animaciones de sección VINCULADAS AL SCROLL (progreso).
 *
 * El usuario hace scroll NORMAL (arriba/abajo) por toda la invitación: las
 * secciones se apilan verticalmente y `.app-scene` se desplaza libremente
 * (sin snap por sección, sin interceptar la rueda ni el teclado).
 *
 * CADA SECCIÓN se desvanece o aparece EN PROPORCIÓN a la distancia de su
 * centro al centro del viewport:
 * - Centrada → completamente visible.
 * - Con un poco de scroll hacia arriba o abajo → pierde opacidad, se desplaza
 *   ligeramente (paralaje) y se desenfoca, en la misma proporción al scroll.
 * - Una pantalla fuera del centro → invisible.
 * Esto aplica a TODAS las secciones por igual (fundido cruzado entre ellas).
 *
 * Las animaciones de entrada de los ELEMENTOS de una sección (eyebrow, título,
 * texto, mapa, formulario...) se ejecutan UNA sola vez, cuando el centro de la
 * sección cruza el CENTRO EXACTO del viewport (stagger vía la clase
 * `.story-section--is-enter`). Al abrir el sobre, la primera sección (hero)
 * recibe además `.story-section--is-reveal` para su entrada 3D de la card.
 *
 * El scroll INTERIOR de las cards (overflow-y: auto + overscroll-behavior:
 * contain) no afecta al scroll entre secciones: al llegar al final de un
 * contenedor interno no salta de sección; el scroll libre de `.app-scene`
 * mueve las secciones y el progreso se calcula a partir de su posición real.
 *
 * @param {string[]} visibleOrder - Claves de sección visibles en orden.
 * @param {{ enabled?: boolean, reducedMotion?: boolean }} options
 * @returns {{ getSectionStyle, getSectionClassName }}
 */
import { useEffect, useRef, useState } from "react";

// Duración de la entrada 3D de la card de la primera sección al abrir el sobre.
const REVEAL_MS = 1500;
// Desenfoque máximo (px) cuando la sección está totalmente fuera del centro.
const MAX_BLUR = 10;
// Factor de paralaje: desplazamiento proporcional a la distancia al centro.
const PARALLAX = 0.12;
// Escala mínima de la card cuando la sección está totalmente fuera del centro.
const MIN_SCALE = 0.94;
// Margen de progreso para cambiar la sección activa (histéresis: evita
// parpadeos en el punto de empate entre dos secciones durante el fundido).
const ACTIVE_MARGIN = 0.04;
// AUTO-CENTRADO SUAVE: si al detener el scroll una sección está cerca del
// centro (dentro de este radio, como fracción de la altura del viewport), se
// desliza suavemente hasta centrarla. Mantiene el scroll libre: solo actúa
// cuando el scroll se asienta, sin interceptar rueda/teclado.
const SNAP_RADIUS = 0.4;
// Silencio de scroll (ms) antes de comprobar el encaje: si el usuario sigue
// moviendo, el chequeo se reprograma y no pelea con el gesto.
const SNAP_DEBOUNCE_MS = 350;

const EMPTY_STYLE: Record<string, string> = {};

export function useStoryNavigation(
  visibleOrder: string[],
  options: { enabled?: boolean; reducedMotion?: boolean } = {},
) {
  const [activeSection, setActiveSection] = useState<string>(visibleOrder[0] || "hero");
  // `centered`: secciones cuyo centro ya cruzó el centro exacto del viewport.
  // Marcan `.story-section--is-enter` (stagger de sus elementos) una sola vez.
  const [centered, setCentered] = useState<Record<string, boolean>>({});
  // `revealing`: entrada 3D de la card de la primera sección al abrir el sobre.
  const [revealing, setRevealing] = useState(false);

  // Espejos en refs: la función `update` lee/escribe sin re-renderizar.
  const centeredRef = useRef<Record<string, boolean>>({});
  const activeRef = useRef<string>(visibleOrder[0] || "hero");
  // Distancia previa (cruce del centro) y referencias DOM para aplicar estilos
  // de progreso por frame sin provocar renderizados.
  const prevDistRef = useRef<Record<string, number>>({});
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});
  const wrapsRef = useRef<Record<string, HTMLElement | null>>({});
  const everDisabledRef = useRef(false);
  const orderKey = visibleOrder.join(",");

  const getSectionClassName = (sectionKey: string) => {
    const primary = visibleOrder[0] || "hero";
    return [
      "story-section",
      `story-section--${sectionKey}`,
      sectionKey === activeSection ? "story-section--is-active" : "",
      centered[sectionKey] ? "story-section--is-enter" : "",
      revealing && sectionKey === primary ? "story-section--is-reveal" : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  useEffect(() => {
    const enabled = options.enabled ?? true;
    if (typeof document === "undefined") return;

    // Mientras el sobre (o el vídeo de bienvenida) está en pantalla, se BLOQUEA
    // el scroll del `.app-scene`: si no, con la rueda/dedos se podía hacer
    // scroll y la invitación (detrás del envelope) se activaba y disparaba sus
    // animaciones de sección. El scroll se restaura cuando `enabled` pasa a
    // true (al terminar la última animación del sobre).
    const scene = document.querySelector<HTMLElement>(".app-scene");
    if (!enabled) {
      everDisabledRef.current = true;
      if (scene) scene.style.overflow = "hidden";
      return () => {
        if (scene) scene.style.overflow = "";
      };
    }
    if (scene) scene.style.overflow = "";

    const reducedMotion = options.reducedMotion === true;
    const primarySection = visibleOrder[0];

    // Al abrir el sobre (enabled pasa de false a true) se vuelve al inicio.
    if (everDisabledRef.current) scene?.scrollTo({ top: 0, behavior: "auto" });

    // Caché de referencias de cada sección (incluye las lazy que montan después).
    const cacheSection = (el: HTMLElement) => {
      const key = el.getAttribute("data-story-section");
      if (!key) return;
      sectionsRef.current[key] = el;
      // La card se revela con el progreso; en secciones sin `.story-card-wrap`
      // (extras) se usa su `.story-panel` como contenedor visual.
      wrapsRef.current[key] = el.querySelector<HTMLElement>(".story-card-wrap, .story-panel");
    };
    Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]")).forEach(cacheSection);

    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]")).forEach((el) => {
          const key = el.getAttribute("data-story-section");
          if (key && sectionsRef.current[key] !== el) cacheSection(el);
        });
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Marca la sección como "centrada": ejecuta el stagger de sus elementos.
    const markCentered = (key: string) => {
      if (centeredRef.current[key]) return;
      centeredRef.current[key] = true;
      setCentered((c) => (c[key] ? c : { ...c, [key]: true }));
    };

    let raf = 0;
    const update = () => {
      const vpCenter = window.innerHeight / 2;
      // Distancia de fundido total: una sección desaparece del todo cuando su
      // centro está a una pantalla (100vh) del centro del viewport; entre
      // secciones contiguas el paso es un fundido cruzado proporcional.
      const norm = window.innerHeight;
      const progressMap: Record<string, number> = {};
      let best = "";
      let bestProgress = -1;
      for (const key of visibleOrder) {
        const sec = sectionsRef.current[key];
        if (!sec) continue;
        const rect = sec.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = center - vpCenter;
        // Progreso 0..1: 1 = centrada, 0 = a una pantalla del centro.
        let progress = 1 - Math.abs(dist) / norm;
        if (progress < 0) progress = 0;
        else if (progress > 1) progress = 1;
        progressMap[key] = progress;

        const wrap = wrapsRef.current[key];
        if (reducedMotion) {
          // Movimiento reducido: contenido siempre visible y sin filtros.
          if (wrap) {
            wrap.style.opacity = "1";
            wrap.style.transform = "none";
            wrap.style.filter = "none";
          }
          sec.style.visibility = "visible";
          markCentered(key);
        } else {
          if (wrap) {
            // Estilos de progreso: opacidad, paralaje y desenfoque en función
            // de la distancia al centro del viewport.
            wrap.style.opacity = String(progress);
            wrap.style.transform = `translateY(${(-dist * PARALLAX).toFixed(2)}px) scale(${(
              MIN_SCALE + (1 - MIN_SCALE) * progress
            ).toFixed(3)})`;
            wrap.style.filter = `blur(${(MAX_BLUR * (1 - progress)).toFixed(2)}px)`;
          }
          // Accesibilidad: la sección fuera de pantalla no es enfocable.
          sec.style.visibility = progress <= 0.001 ? "hidden" : "visible";
          // Cruce del centro EXACTO: el centro de la sección pasa por el centro
          // del viewport → stagger de entrada (una sola vez).
          const prev = prevDistRef.current[key];
          if (prev === undefined) {
            prevDistRef.current[key] = dist;
            if (Math.abs(dist) <= 1) markCentered(key);
          } else {
            if ((prev > 0 && dist <= 0) || (prev < 0 && dist >= 0)) markCentered(key);
            prevDistRef.current[key] = dist;
          }
        }

        if (progress > bestProgress) {
          bestProgress = progress;
          best = key;
        }
      }

      // Cambia la sección activa con histéresis: solo si la nueva supera con
      // claridad el progreso de la activa actual (evita parpadeo en el empate).
      const current = activeRef.current;
      const currentProgress = progressMap[current] ?? -1;
      if (best && best !== current && bestProgress > currentProgress + ACTIVE_MARGIN) {
        activeRef.current = best;
        setActiveSection(best);
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
      scheduleSnap();
    };

    // Auto-centrado suave (snap): tras un silencio de scroll, si la sección
    // más cercana al centro está dentro del radio, se desplaza suavemente
    // hasta quedar centrada. No interfiere con el scroll libre: solo actúa
    // cuando el usuario se detiene cerca del centro.
    let snapTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleSnap = () => {
      if (reducedMotion) return;
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        snapTimer = null;
        const scroller = document.querySelector<HTMLElement>(".app-scene");
        if (!scroller) return;
        const vpCenter = window.innerHeight / 2;
        let bestDist = Infinity;
        for (const key of visibleOrder) {
          const sec = sectionsRef.current[key];
          if (!sec) continue;
          const rect = sec.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const d = center - vpCenter;
          if (Math.abs(d) < Math.abs(bestDist)) bestDist = d;
        }
        if (!Number.isFinite(bestDist)) return;
        const snapRadius = window.innerHeight * SNAP_RADIUS;
        // Solo encaja si está dentro del radio y hay que moverse al menos 1px.
        if (Math.abs(bestDist) < snapRadius && Math.abs(bestDist) > 1) {
          scroller.scrollTo({ top: scroller.scrollTop + bestDist, behavior: "smooth" });
        }
      }, SNAP_DEBOUNCE_MS);
    };

    scene?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Estado inicial: al revelarse la invitación el hero está centrado y su
    // stagger (y la entrada 3D vía is-reveal) arranca sin esperar un scroll.
    update();

    let revealTimer: ReturnType<typeof setTimeout> | null = null;
    if (everDisabledRef.current && primarySection && !reducedMotion) {
      setRevealing(true);
      revealTimer = setTimeout(() => setRevealing(false), REVEAL_MS);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      scene?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mutationObserver?.disconnect();
      if (revealTimer) clearTimeout(revealTimer);
      if (snapTimer) clearTimeout(snapTimer);
    };
  }, [orderKey, visibleOrder, options.enabled, options.reducedMotion]);

  const getSectionStyle = (_sectionKey?: string) => EMPTY_STYLE;

  return {
    getSectionStyle,
    getSectionClassName,
  };
}
