/**
 * useAnimations — Hook combinado para la app pública.
 *
 * Devuelve la base del admin (`adminDisabled`), la del invitado
 * (`guestDisabled`) y el conjunto EFECTIVO (unión de ambas), además de
 * `isDisabled(id)` y los mutadores del invitado.
 *
 * Requiere ConfigProvider (lee `config.disabledAnimations`) y
 * AnimationsProvider: úsalo dentro de la app (AppShell, PublicInvitation y
 * secciones), no fuera. Separado del proveedor para preservar fast-refresh.
 */

import { useCallback, useMemo } from "react";
import { parseDisabledAnimations, EMPTY_ANIMATION_SET } from "../lib/animations";
import { useConfig } from "../contexts/useConfig";
import { useAnimationsContext } from "../contexts/AnimationsContext";

export function useAnimations() {
  const { guestDisabled, toggleGuestAnimation, setGuestGroup, setAllGuest, resetGuest } = useAnimationsContext();
  const { config } = useConfig();

  // Base global decidida por los novios (ids sanitizados al cargar config).
  const adminDisabled = useMemo(
    () => parseDisabledAnimations(config.disabledAnimations),
    [config.disabledAnimations],
  );

  // Conjunto efectivo: lo desactivado por el admin O por este invitado.
  const effectiveDisabled = useMemo(() => {
    if (adminDisabled.size === 0 && guestDisabled.size === 0) return EMPTY_ANIMATION_SET;
    const union = new Set(adminDisabled);
    for (const id of guestDisabled) union.add(id);
    return union;
  }, [adminDisabled, guestDisabled]);

  const isDisabled = useCallback((id: string) => effectiveDisabled.has(id), [effectiveDisabled]);

  return {
    adminDisabled,
    guestDisabled,
    effectiveDisabled,
    isDisabled,
    toggleGuestAnimation,
    setGuestGroup,
    setAllGuest,
    resetGuest,
  };
}
