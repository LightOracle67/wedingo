/**
 * AnimationPrefsApplier — Aplica al <html> las clases que desactivan las
 * animaciones (`wed-no-anim-<id>`), según el conjunto EFECTIVO (base del
 * admin ∪ preferencias del invitado). Las reglas de animaciones.css matchean
 * esas clases para anular cada animación sin tocar el marcado.
 *
 * Se monta una única vez en AppShell (dentro de ConfigProvider y
 * AnimationsProvider): se re-ejecuta cuando cambia la config o las
 * preferencias del invitado, aplicando el diff de clases.
 */

import { useEffect } from "react";
import { useAnimations } from "../contexts";

/** Prefijo de las clases que gestiona este componente. */
const CLASS_PREFIX = "wed-no-anim-";

export default function AnimationPrefsApplier() {
  const { effectiveDisabled } = useAnimations();

  useEffect(() => {
    const root = document.documentElement;
    // Clases que deben quedar activas tras esta ejecución.
    const wanted = new Set<string>();
    for (const id of effectiveDisabled) wanted.add(`${CLASS_PREFIX}${id}`);

    // Clases actualmente aplicadas por este componente (solo el prefijo
    // evita borrar clases de terceros o de otros sistemas).
    const current = Array.from(root.classList).filter((c) => c.startsWith(CLASS_PREFIX));

    // Diff: quita las que ya no aplican y añade las nuevas (idempotente).
    for (const c of current) {
      if (!wanted.has(c)) root.classList.remove(c);
    }
    for (const c of wanted) {
      if (!root.classList.contains(c)) root.classList.add(c);
    }
  }, [effectiveDisabled]);

  return null;
}
