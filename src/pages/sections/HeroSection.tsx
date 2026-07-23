import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import heroBackdropSrc from "../../assets/rings.webp";
import LoadingOverlay from "../../components/LoadingOverlay";

const HeroSection = memo(function HeroSection({ style, className, firstName, secondName, inviteMessage, countdown, couplePhoto, godparent1, godparent2 }: any) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = heroBackdropSrc;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);
  const { t } = useTranslation();
  const [photoLoaded, setPhotoLoaded] = useState(false);

  return (
    <section
      data-story-section="hero"
      className={`${className} relative flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--hero w-full text-center">
        <div className="relative z-20">
          <div className="story-eyebrow">{t("hero.eyebrow")}</div>
          {couplePhoto ? (
            <div className="mx-auto" style={{ position: "relative", height: "90%", aspectRatio: "4/3", overflow: "hidden", overflowY: "hidden" }}>
              <div style={{
                position: "absolute", inset: 0, opacity: photoLoaded ? 1 : 0, transition: "opacity 0.3s ease",
                maskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
                maskMode: "luminance", WebkitMaskMode: "luminance",
              }}>
                <img src={couplePhoto} alt={t("hero.couplePhotoAlt")} onLoad={() => setPhotoLoaded(true)} onError={() => setPhotoLoaded(true)} className="w-full h-full object-cover" />
              </div>
              <LoadingOverlay visible={!photoLoaded} />
              <div style={{
                position: "absolute", inset: 0, zIndex: 10,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.3) 100%)",
                padding: "1rem",
              }}>
                <h1 className="story-title" style={{
                  position: "relative", zIndex: 11, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                  fontSize: "clamp(1.8rem, 5vw, 3rem)", margin: 0,
                }}>
                  {firstName || ""} & {secondName || ""}
                </h1>
              </div>
            </div>
          ) : (
            <div className="relative mx-auto w-fit">
              <div className="hero-rings pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[42%]">
                <img src={heroBackdropSrc} alt="" aria-hidden="true" loading="lazy" className="invite-rings block h-auto w-[clamp(11rem,44vw,18rem)] object-contain object-center sm:w-[clamp(13rem,34vw,20rem)]" />
              </div>
              <h1 className="story-title relative z-10">
                {firstName || ""} & {secondName || ""}
              </h1>
            </div>
          )}
          <p className="story-copy mt-3 sm:mt-4">
            {inviteMessage}
          </p>
          {godparent1 && godparent2 ? (
            <p className="story-copy mt-2" style={{ fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)", opacity: 0.85, fontStyle: "italic", letterSpacing: "0.04em", color: "var(--invite-copy-color, #c8b898)", textShadow: "0 0 8px color-mix(in srgb, var(--flower-accent, #d8b24a) 20%, transparent), 0 0 20px color-mix(in srgb, var(--flower-accent, #d8b24a) 8%, transparent)", animation: "godparent-glow 3s ease-in-out infinite" }}>
              {t("hero.withBlessing", { godparent1, godparent2 })}
            </p>
          ) : null}
          {countdown ? (
            <div className="mt-6">
              <p className="text-[clamp(0.8rem,2.2vw,1rem)] font-sans tracking-widest uppercase text-boda-texto/60">
                {countdown.expired ? t("hero.todayIsWedding") : t("hero.missing")}
              </p>
              {!countdown.expired ? (
                <p className="text-[clamp(1.4rem,4vw,2.2rem)] leading-tight font-serif tracking-wide text-boda-texto">
                  {(() => {
                    if (countdown.years > 0) {
                      return `${t('countdown.year', { count: countdown.years })} · ${t('countdown.month', { count: countdown.months })}`;
                    }
                    if (countdown.months > 0) {
                      const weeks = Math.floor(countdown.days / 7);
                      return `${t('countdown.month', { count: countdown.months })} · ${t('countdown.week', { count: weeks })}`;
                    }
                    if (countdown.days >= 7) {
                      const w = Math.floor(countdown.days / 7);
                      return `${t('countdown.week', { count: w })} · ${t('countdown.day', { count: countdown.days % 7 })}`;
                    }
                    if (countdown.days > 0) {
                      return `${t('countdown.day', { count: countdown.days })} · ${countdown.hours}h`;
                    }
                    if (countdown.hours > 0) {
                      return `${t('countdown.hour', { count: countdown.hours })} · ${countdown.minutes} min`;
                    }
                    return t('countdown.minute', { count: countdown.minutes });
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
