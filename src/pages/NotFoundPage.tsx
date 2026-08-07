/**
 * NotFoundPage.tsx
 * ─────────────────────────────────────────────────────────────
 * Página de error 404: sustituye la redirección silenciosa a la home para
 * que el usuario no pierda el contexto de una URL rota.
 *
 * @module NotFoundPage
 */

import { useTranslation } from "react-i18next";
import { Link } from "react-router";

const NotFoundPage = () => {
  const { t } = useTranslation();
  return (
    <div className="app-scene" data-testid="not-found-page">
      <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
        <div className="w-full max-w-md text-center story-panel story-panel--hero">
          <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
            {t("notFound.code")}
          </h1>
          <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
            {t("notFound.title")}
          </p>
          <div className="my-6 story-divider" />
          <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{t("notFound.text")}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/" className="text-sm setup-button">
              {t("notFound.homeLink")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NotFoundPage;
