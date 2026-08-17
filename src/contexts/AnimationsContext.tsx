/**
 * AnimationsContext — Preferencias de animación POR INVITADO + proveedor.
 *
 * La pareja decide qué animaciones existen en la invitación
 * (`config.disabledAnimations`, base global). Cada invitado puede, además,
 * desactivar animaciones en SU dispositivo (localStorage, como el resto de
 * preferencias de accesibilidad: almacenamiento técnicamente necesario, no
 * sujeto al consentimiento de cookies).
 *
 * Una animación queda DESACTIVADA si está en la config del admin O en las
 * preferencias del invitado (nunca reactivable por el invitado si el admin la
 * apagó: la base manda). El hook combinado `useAnimations` (hooks/useAnimations.ts)
 * une ambas fuentes y expone `isDisabled(id)` para los consumidores de runtime.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  parseDisabledAnimations,
  serializeDisabledAnimations,
  ANIMATIONS,
  ALL_ANIMATIONS_KEY,
  EMPTY_ANIMATION_SET,
} from "../lib/animations";
import { STORAGE_KEYS } from "../lib/storage-keys";

/** Mapa id → grupo (construido una vez para lookup O(1)). */
const ANIM_GROUP_BY_ID: ReadonlyMap<string, string> = new Map(ANIMATIONS.map((a) => [a.id, a.groupId]));

/** Forma persistida en localStorage (lista de ids desactivados, sanitizada). */
interface StoredGuestPrefs {
  disabled: string;
}

/** Estado y mutadores de las preferencias del invitado. */
export interface AnimationsContextValue {
  /** Ids de animaciones desactivadas por este invitado en este dispositivo. */
  guestDisabled: ReadonlySet<string>;
  /** Activa/desactiva una animación concreta en este dispositivo. */
  toggleGuestAnimation: (id: string) => void;
  /** Activa (`enabled=true`) o desactiva toda una SECCIÓN (grupo) en este
   *  dispositivo: añade o quita todos los ids del grupo de golpe. */
  setGuestGroup: (groupId: string, enabled: boolean) => void;
  /** Activa (`enabled=true`) o desactiva todas las animaciones en este
   *  dispositivo mediante la clave reservada `all` (conserva las individuales). */
  setAllGuest: (enabled: boolean) => void;
  /** Restablece las preferencias de animación de este invitado. */
  resetGuest: () => void;
}

/** Carga la lista guardada tolerando almacenamiento bloqueado o corrupto. */
function loadGuestDisabled(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.animations);
    if (!raw) return EMPTY_ANIMATION_SET;
    const parsed = JSON.parse(raw) as Partial<StoredGuestPrefs>;
    return parseDisabledAnimations(typeof parsed.disabled === "string" ? parsed.disabled : undefined);
  } catch {
    return EMPTY_ANIMATION_SET;
  }
}

/** Guarda la lista (acceso directo: preferencia técnica de accesibilidad). */
function saveGuestDisabled(disabled: ReadonlySet<string>) {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.animations,
      JSON.stringify({ disabled: serializeDisabledAnimations(disabled) } satisfies StoredGuestPrefs),
    );
  } catch {
    /* almacenamiento no disponible */
  }
}

const AnimationsContext = createContext<AnimationsContextValue | null>(null);

/** Proveedor de las preferencias de animación del invitado (persistencia). */
export function AnimationsProvider({ children }: { children: ReactNode }) {
  const [guestDisabled, setGuestDisabled] = useState<ReadonlySet<string>>(loadGuestDisabled);

  // Persistencia reactiva: cada cambio en las preferencias del invitado se
  // guarda en localStorage (best-effort con try/catch).
  useEffect(() => {
    saveGuestDisabled(guestDisabled);
  }, [guestDisabled]);

  const toggleGuestAnimation = useCallback((id: string) => {
    setGuestDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Activa/desactiva una SECCIÓN completa (añade/quita todos los ids del grupo
  // de una vez, evitando N actualizaciones de estado).
  const setGuestGroup = useCallback((groupId: string, enabled: boolean) => {
    setGuestDisabled((prev) => {
      const next = new Set(prev);
      for (const [id, gid] of ANIM_GROUP_BY_ID) {
        if (gid !== groupId) continue;
        if (enabled) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  // "Desactivar todas" usa la clave reservada `all` (conserva los ids
  // individuales para poder recuperarlos al reactivar).
  const setAllGuest = useCallback((enabled: boolean) => {
    setGuestDisabled((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(ALL_ANIMATIONS_KEY);
      else next.delete(ALL_ANIMATIONS_KEY);
      return next;
    });
  }, []);

  const resetGuest = useCallback(() => setGuestDisabled(EMPTY_ANIMATION_SET), []);

  const value = useMemo<AnimationsContextValue>(
    () => ({
      guestDisabled,
      toggleGuestAnimation,
      setGuestGroup,
      setAllGuest,
      resetGuest,
    }),
    [guestDisabled, toggleGuestAnimation, setGuestGroup, setAllGuest, resetGuest],
  );

  return <AnimationsContext.Provider value={value}>{children}</AnimationsContext.Provider>;
}

/** Hook del proveedor (error si no está montado). */
export function useAnimationsContext(): AnimationsContextValue {
  const ctx = useContext(AnimationsContext);
  if (!ctx) throw new Error("useAnimationsContext debe usarse dentro de AnimationsProvider");
  return ctx;
}
