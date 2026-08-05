/**
 * useStoryNavigation.js
 * Hook simplificado: la navegación entre secciones se hace mediante
 * CSS scroll-snap. No requiere event listeners ni inline styles.
 *
 * @param {string[]} visibleOrder - Array ordenado de claves de sección visibles.
 * @returns {object} API compatible con PublicInvitation.
 */
/** Estilo vacío compartido: misma referencia en cada render para no romper
 *  el React.memo de las secciones (un objeto nuevo por tick re-renderizaba
 *  toda la invitación una vez por segundo con el countdown). */
const EMPTY_STYLE: Record<string, string> = {};

export function useStoryNavigation(visibleOrder: string[]) {
  const getSectionStyle = (_sectionKey?: string) => EMPTY_STYLE;
  const getSectionClassName = (sectionKey: string) =>
    ["story-section", `story-section--${sectionKey}`].filter(Boolean).join(" ");

  return {
    activeSection: visibleOrder[0] || "hero",
    transition: { fromIndex: 0, toIndex: null, direction: 1 },
    isTransitioning: false,
    getSectionStyle,
    getSectionClassName,
    startTransition: (_index?: number) => {},
  };
}
