/**
 * Botón flotante "Confirmar asistencia": aparece en la invitación pública
 * cuando la sección RSVP existe, aún no se ha enviado respuesta y la sección
 * NO está visible en el viewport. Al pulsarlo lleva suavemente a #rsvp.
 * Objetivo: acortar el camino hasta el formulario en páginas largas.
 */
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface FloatingRsvpCtaProps {
  /** Id del ancla de la sección RSVP a la que navegar. */
  targetId?: string;
  /** Oculto tras enviar la respuesta (el CTA deja de tener sentido). */
  hidden?: boolean;
}

const FloatingRsvpCta = memo(({ targetId = "rsvp", hidden = false }: FloatingRsvpCtaProps) => {
  const { t } = useTranslation();
  // Empieza oculto: solo se muestra cuando el observer confirma que #rsvp
  // está fuera de pantalla; evita el destello antes de montar la sección.
  const [outOfView, setOutOfView] = useState(false);

  useEffect(() => {
    // Sin IntersectionObserver (navegadores muy antiguos) el botón no molesta.
    if (typeof IntersectionObserver === "undefined") return;
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(
      // isIntersecting=true → sección visible → ocultar CTA.
      (entries) => setOutOfView(!entries[0]?.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  // hidden cubre portada cerrada / respuesta ya enviada.
  if (hidden || !outOfView) return null;

  return (
    <button
      type="button"
      className="floating-rsvp-cta"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })}
    >
      {t("rsvp.floatingCta")}
    </button>
  );
});

FloatingRsvpCta.displayName = "FloatingRsvpCta";
export default FloatingRsvpCta;
