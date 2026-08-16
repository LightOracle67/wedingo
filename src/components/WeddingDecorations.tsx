/**
 * WeddingDecorations — Decoraciones laterales (ramas de eucalipto) de la
 * invitación pública. Fijas a la pantalla, sin interacción; su bamboleo
 * (wind-sway) y flotación (subtle-float) se gestionan por CSS y respetan las
 * preferencias de animación. Extraído de PublicInvitation para modularizar.
 */

import { memo } from "react";
import eucalyptusSrc from "../assets/eucalyptus.webp";

const WeddingDecorations = memo(function WeddingDecorations() {
  return (
    <>
      <div
        className="fixed top-0 pointer-events-none left-2 wedding-decoration--left wedding-decoration"
        style={{ zIndex: 0 }}
      >
        {/* width/height reservan el layout del eucalipto (decorativo, 2000x2000
            renderizado a ~250-400px) para evitar CLS (CLS == 0). */}
        <img
          src={eucalyptusSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width="2000"
          height="2000"
          className="wedding-decoration__image"
        />
      </div>
      <div
        className="fixed pointer-events-none right-2 bottom-2 wedding-decoration--right wedding-decoration"
        style={{ zIndex: 0 }}
      >
        {/* width/height reservan el layout del eucalipto (decorativo, 2000x2000
            renderizado a ~250-400px) para evitar CLS (CLS == 0). */}
        <img
          src={eucalyptusSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width="2000"
          height="2000"
          className="wedding-decoration__image"
        />
      </div>
    </>
  );
});

export default WeddingDecorations;
