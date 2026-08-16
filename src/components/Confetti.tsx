/**
 * Confetti — Lluvia de confeti decorativa al abrir el sobre.
 *
 * Piezas CSS puras con una animación de caída (respetada por
 * prefers-reduced-motion y por la preferencia `confetti-fall`). Va DETRÁS de
 * la invitación (z-index bajo) y cada pieza cae una única vez. Sin
 * interacción. Extraído de PublicInvitation para modularizar la página.
 */

import { memo, useMemo } from "react";

/** Duración (ms) de la caída: la caída es uniforme (misma duración y stagger
 *  corto) para que se vea elegante y no errática. */
const CONF_FALL_MS = 2200;
/** Tiempo total de vida en pantalla (caída + margen de fin). */
export const CONF_TOTAL_MS = CONF_FALL_MS + 900;

const Confetti = memo(function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        // Distribución uniforme (no aleatoria): el confeti se ve natural, no
        // errático.
        left: `${(i * 2.1) % 100}%`,
        delay: `${(i % 9) * 0.1}s`,
        duration: `${CONF_FALL_MS}ms`,
        color: ["#d8b24a", "#e8d0d8", "#8fb8a8", "#f0e6d0", "#c8a84e"][i % 5],
        size: `${7 + (i % 3) * 3}px`,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti__piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            background: p.color,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
});

export default Confetti;
