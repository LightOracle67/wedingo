import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook que gestiona la navegación por scroll/touch/teclado entre secciones
 * de historia (story sections). Controla el estado activo, las transiciones
 * animadas y los estilos CSS dinámicos de cada sección.
 *
 * @param {string[]} visibleOrder - Array ordenado de claves de sección visibles.
 * @returns {object} Métodos y estado para pintar y navegar las secciones.
 */
export function useStoryNavigation(visibleOrder) {
  const [activeSection, setActiveSection] = useState(visibleOrder[0] || "hero");

  // Estado de la transición animada entre secciones.
  const [transition, setTransition] = useState({
    fromIndex: 0,
    toIndex: null,
    direction: 1,
  });

  // Refs para que los callbacks siempre lean el último valor sin re-registrarse.
  const visibleOrderRef = useRef(visibleOrder);
  const activeSectionRef = useRef(activeSection);
  const transitionRef = useRef(transition);

  // Sincroniza las refs cuando cambian los valores.
  useEffect(() => { visibleOrderRef.current = visibleOrder; }, [visibleOrder]);
  useEffect(() => { activeSectionRef.current = activeSection; }, [activeSection]);
  useEffect(() => { transitionRef.current = transition; }, [transition]);

  // Corrige el activeSection si la sección actual deja de ser visible (ej: se oculta).
  useEffect(() => {
    if (!visibleOrder.includes(activeSection) && visibleOrder.length > 0) {
      setActiveSection(visibleOrder[0]);
    }
  }, [visibleOrder, activeSection]);

  const isTransitioning = transition.toIndex !== null;

  /**
   * Helper interno: actualiza el estado de transición de forma atómica.
   */
  const applyTransition = useCallback((nextState) => {
    transitionRef.current = nextState;
    setTransition(nextState);
  }, []);

  /**
   * Inicia una transición animada hacia la sección adyacente (dirección ±1).
   * Si ya hay una transición en curso, la ignora.
   */
  const startTransition = useCallback((direction) => {
    if (transitionRef.current.toIndex !== null) return;

    const order = visibleOrderRef.current;
    const currentIndex = order.indexOf(activeSectionRef.current);
    const targetIndex = Math.max(0, Math.min(order.length - 1, currentIndex + direction));
    if (targetIndex === currentIndex) return;

    applyTransition({ fromIndex: currentIndex, toIndex: targetIndex, direction });

    // Al terminar la animación (650ms), fija la nueva sección activa.
    window.setTimeout(() => {
      const completedSection = order[targetIndex];
      activeSectionRef.current = completedSection;
      setActiveSection(completedSection);
      applyTransition({ fromIndex: targetIndex, toIndex: null, direction });
    }, 650);
  }, [applyTransition]);

  /**
   * La visibilidad y transiciones se controlan via CSS class story-section--is-active.
   * Este wrapper mantiene la API pero sin inline styles conflictivos.
   */
  const getSectionStyle = useCallback(() => ({}), []);

  /**
   * Construye la clase CSS para una sección.
   */
  const getSectionClassName = useCallback((sectionKey) => {
    const order = visibleOrderRef.current;
    const sectionIndex = order.indexOf(sectionKey);
    const activeIndex = order.indexOf(activeSection);
    const { fromIndex, toIndex } = transition;

    const isActiveSection = sectionIndex === activeIndex;
    const isTransitionSection = toIndex !== null && (sectionIndex === fromIndex || sectionIndex === toIndex);

    return [
      "story-section",
      `story-section--${sectionKey}`,
      isActiveSection || isTransitionSection ? "story-section--is-active" : "",
    ].filter(Boolean).join(" ");
  }, [activeSection, transition]);

  /**
   * Registra los listeners de wheel, keydown, touchstart y touchend
   * para la navegación global entre secciones.
   */
  useEffect(() => {
    document.body.style.overflow = "hidden";

    let touchStartY = null;
    const IGNORE_SELECTOR = "input, textarea, select, [contenteditable]";

    /** Verifica si el target es un Element del DOM antes de llamar a closest. */
    const isElement = (target) => target instanceof Element;

    const handleWheel = (event) => {
      if (isElement(event.target) && event.target.closest(IGNORE_SELECTOR)) return;
      // Si el scroll está dentro de una tarjeta, no navega salvo que llegue al borde.
      const card = isElement(event.target) ? event.target.closest(".story-card") : null;
      if (card) {
        const { scrollTop, scrollHeight, clientHeight } = card;
        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
        if (event.deltaY < 0 && !atTop) return;
        if (event.deltaY > 0 && !atBottom) return;
      }
      if (event.deltaY === 0) return;
      event.preventDefault();
      startTransition(event.deltaY > 0 ? 1 : -1);
    };

    const handleKeyDown = (event) => {
      if (isElement(event.target) && event.target.closest(IGNORE_SELECTOR)) return;
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        startTransition(1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        startTransition(-1);
      }
    };

    const handleTouchStart = (event) => {
      if (isElement(event.target) && event.target.closest(IGNORE_SELECTOR)) {
        touchStartY = null;
        return;
      }
      touchStartY = event.touches[0]?.clientY ?? null;
    };

    const handleTouchEnd = (event) => {
      const touchEndY = event.changedTouches[0]?.clientY ?? null;
      if (touchStartY === null || touchEndY === null) return;
      const distance = touchStartY - touchEndY;
      if (Math.abs(distance) >= 28) {
        event.preventDefault();
        startTransition(distance > 0 ? 1 : -1);
      }
      touchStartY = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      document.body.style.overflow = "";
    };
  }, [startTransition]);

  return {
    activeSection,
    transition,
    isTransitioning,
    getSectionStyle,
    getSectionClassName,
    startTransition,
  };
}
