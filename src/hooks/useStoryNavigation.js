/**
 * useStoryNavigation.js
 * Hook simplificado: la navegación entre secciones se hace mediante
 * CSS scroll-snap. No requiere event listeners ni inline styles.
 *
 * @param {string[]} visibleOrder - Array ordenado de claves de sección visibles.
 * @returns {object} API compatible con PublicInvitation.
 */
export function useStoryNavigation(visibleOrder) {
  const getSectionStyle = () => ({});
  const getSectionClassName = (sectionKey) =>
    ["story-section", `story-section--${sectionKey}`].filter(Boolean).join(" ");

  return {
    activeSection: visibleOrder[0] || "hero",
    transition: { fromIndex: 0, toIndex: null, direction: 1 },
    isTransitioning: false,
    getSectionStyle,
    getSectionClassName,
    startTransition: () => {},
  };
}
