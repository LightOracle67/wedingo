/**
 * useAnimations — Hook combinado para la app pública.
 *
 * Devuelve la base del admin (`adminDisabled`), la del invitado
 * (`guestDisabled`) y el conjunto EFECTIVO (unión de ambas), además de
 * `isDisabled(id)` y los mutadores del invitado.
 *
 * La clave reservada `ALL_ANIMATIONS_KEY` ("all") en cualquiera de las dos
 * fuentes desactiva TODAS las animaciones: `allOff` lo indica y
 * `effectiveDisabled` pasa a contener todos los ids.
 *
 * Requiere ConfigProvider (lee `config.disabledAnimations`) y
 * AnimationsProvider: úsalo dentro de la app (AppShell, PublicInvitation y
 * secciones), no fuera. Separado del proveedor para preservar fast-refresh.
 */

import { useCallback, useContext, useMemo } from "react";
import {
  parseDisabledAnimations,
  EMPTY_ANIMATION_SET,
  ALL_ANIMATION_IDS,
  ALL_ANIMATIONS_KEY,
  ANIMATIONS,
} from "../lib/animations";
import { ConfigContext } from "../contexts/useConfig";
import type { InvitationConfig } from "../types";
import { useAnimationsContext } from "../contexts/AnimationsContext";

/** Conjunto de los ids de un grupo (construido una vez). */
const GROUP_IDS_BY_GROUP: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const anim of ANIMATIONS) {
    const bucket = map.get(anim.groupId);
    if (bucket) bucket.push(anim.id);
    else map.set(anim.groupId, [anim.id]);
  }
  return map;
})();

export function useAnimations() {
  const { guestDisabled, toggleGuestAnimation, setGuestGroup, setAllGuest, resetGuest } = useAnimationsContext();
  // v2.192 (rama firebase-lazy): la BASE del admin vive en la config de la
  // invitación (ConfigProvider, montado POR RUTA). El shell (nav/footer,
  // AnimationPrefsApplier) usa este hook SIN provider: en ese caso la base
  // del admin se trata como vacía (solo aplican las preferencias del
  // invitado, que sí viven en AnimationsProvider).
  const optionalCtx = useContext(ConfigContext);
  const config = optionalCtx?.config ?? ({} as InvitationConfig);

  // Base global decidida por los novios (ids sanitizados al cargar config).
  const adminDisabled = useMemo(() => parseDisabledAnimations(config.disabledAnimations), [config.disabledAnimations]);

  // "Todo apagado" si lo pide el admin O el invitado.
  const allOff = adminDisabled.has(ALL_ANIMATIONS_KEY) || guestDisabled.has(ALL_ANIMATIONS_KEY);

  // Conjunto efectivo: lo desactivado por el admin O por este invitado.
  // Con `all` activo se devuelve el conjunto de TODOS los ids (sin alocaciones
  // si ya lo está).
  const effectiveDisabled = useMemo(() => {
    if (allOff) return ALL_ANIMATION_IDS;
    if (adminDisabled.size === 0 && guestDisabled.size === 0) return EMPTY_ANIMATION_SET;
    const union = new Set(adminDisabled);
    for (const id of guestDisabled) union.add(id);
    return union;
  }, [allOff, adminDisabled, guestDisabled]);

  const isDisabled = useCallback((id: string) => effectiveDisabled.has(id), [effectiveDisabled]);

  /** Devuelve si TODAS las animaciones de un grupo están desactivadas: en ese
   *  caso el comportamiento COMPLETO del grupo se salta (p. ej. el sobre no
   *  aparece). Con `allOff` cualquier grupo lo está. */
  const isGroupFullyDisabled = useCallback(
    (groupId: string) => {
      if (allOff) return true;
      const ids = GROUP_IDS_BY_GROUP.get(groupId) ?? [];
      return ids.length > 0 && ids.every((id) => effectiveDisabled.has(id));
    },
    [allOff, effectiveDisabled],
  );

  return {
    adminDisabled,
    guestDisabled,
    effectiveDisabled,
    allOff,
    isDisabled,
    isGroupFullyDisabled,
    toggleGuestAnimation,
    setGuestGroup,
    setAllGuest,
    resetGuest,
  };
}
