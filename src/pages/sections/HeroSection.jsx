import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import heroBackdropSrc from "../../assets/rings.webp";

const HeroSection = memo(function HeroSection({ style, className, firstName, secondName, inviteMessage, countdown, couplePhoto, godparent1, godparent2 }) {
  const { t } = useTranslation();
  const [photoLoaded, setPhotoLoaded] = useState(false);

  return (
    <section
      data-story-section="hero"
      className={`${className} relative flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="invite-shell story-panel story-panel--hero relative z-10 mx-auto w-full rounded-[2rem] bg-transparent text-center shadow-2xl" style={{ maxWidth: "min(100%, 32rem)", padding: "clamp(0.6rem, 2vw, 1.2rem)", boxSizing: "border-box", overflowY: "auto" }}>
        <div className="relative z-20">
          {couplePhoto ? (
            <div className="mx-auto mb-4 w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2" style={{ borderColor: "color-mix(in srgb, var(--invite-shell-border) 80%, transparent)", background: "color-mix(in srgb, var(--setup-field-bg) 50%, transparent)" }}>
              {!photoLoaded ? <div className="page-loading" style={{ width: "100%", height: "100%", minHeight: 0 }} /> : null}
              <img src={couplePhoto} alt={t("hero.couplePhotoAlt")} onLoad={() => setPhotoLoaded(true)} className="w-full h-full object-cover" style={{ display: photoLoaded ? "block" : "none" }} />
            </div>
          ) : null}
          <div className="relative mx-auto w-fit">
            <div className="hero-rings pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[42%]">
              <img
                src={heroBackdropSrc}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="invite-rings block h-auto w-[clamp(11rem,44vw,18rem)] object-contain object-center sm:w-[clamp(13rem,34vw,20rem)]"
              />
            </div>
            <h1 className="hero-title invite-title relative z-10 mt-4 text-[clamp(1.2rem,4.5vw,2.6rem)] leading-tight font-serif text-boda-texto sm:text-[clamp(1.4rem,3.5vw,2.8rem)] lg:text-[clamp(1.6rem,3vw,3rem)]">
              {firstName} & {secondName}
            </h1>
          </div>
          <p className="hero-message invite-copy mt-3 text-[clamp(0.95rem,2.8vw,1.25rem)] leading-relaxed font-serif text-boda-texto sm:mt-4 sm:text-[clamp(1rem,2.5vw,1.35rem)]">
            {inviteMessage}
          </p>
          {godparent1 && godparent2 ? (
            <p className="hero-message invite-copy mt-2" style={{ fontSize: "clamp(0.8rem, 2vw, 1rem)", opacity: 0.7, fontStyle: "italic", letterSpacing: "0.04em" }}>
              {t("hero.withBlessing", { godparent1, godparent2 })}
            </p>
          ) : null}
          {countdown ? (
            <div className="hero-countdown mt-6">
              <p className="text-[clamp(0.8rem,2.2vw,1rem)] font-sans tracking-widest uppercase text-boda-texto/60">
                {countdown.expired ? t("hero.todayIsWedding") : t("hero.missing")}
              </p>
              {!countdown.expired ? (
                <p className="text-[clamp(1.4rem,4vw,2.2rem)] leading-tight font-serif tracking-wide text-boda-texto">
                  {(() => {
                    if (countdown.years > 0) {
                      if (countdown.years === 1) return `${countdown.years} año · ${countdown.months} meses`;
                      return `${countdown.years} años · ${countdown.months} meses`;
                    }
                    if (countdown.months > 0) {
                      const weeks = Math.floor(countdown.days / 7);
                      if (countdown.months === 1) return `1 mes · ${weeks} semanas`;
                      return `${countdown.months} meses · ${weeks} semanas`;
                    }
                    if (countdown.days >= 7) {
                      const w = Math.floor(countdown.days / 7);
                      if (w === 1) return `1 semana · ${countdown.days % 7} días`;
                      return `${w} semanas · ${countdown.days % 7} días`;
                    }
                    if (countdown.days > 0) {
                      if (countdown.days === 1) return `1 día · ${countdown.hours}h`;
                      return `${countdown.days} días · ${countdown.hours}h`;
                    }
                    if (countdown.hours > 0) {
                      if (countdown.hours === 1) return `1 hora · ${countdown.minutes} min`;
                      return `${countdown.hours} horas · ${countdown.minutes} min`;
                    }
                    if (countdown.minutes === 1) return "1 minuto";
                    return `${countdown.minutes} minutos`;
                  })()}
                </p>
              ) : (
                <p className="mt-1 text-[clamp(1.5rem,4vw,2.5rem)] leading-tight font-serif text-boda-texto">{t("hero.todayIsTheDay")}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
});

export default HeroSection;
