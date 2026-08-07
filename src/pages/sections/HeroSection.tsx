import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import LoadingOverlay from "../../components/LoadingOverlay";
import CornerDecorations from "../../components/CornerDecorations";

interface HeroSectionProps {
  style?: React.CSSProperties;
  className?: string;
  firstName?: string;
  secondName?: string;
  inviteMessage?: string;
  countdown?: {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } | null;
  couplePhoto?: string;
  godparent1?: string;
  godparent2?: string;
  cornerDecoration?: string;
}

const HeroSection = memo(function HeroSection({
  style,
  className,
  firstName,
  secondName,
  inviteMessage,
  countdown,
  couplePhoto,
  godparent1,
  godparent2,
  cornerDecoration,
}: HeroSectionProps) {
  const { t } = useTranslation();
  const [photoLoaded, setPhotoLoaded] = useState(false);

  return (
    <section
      data-story-section="hero"
      className={`${className} relative flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card-wrap story-card-wrap--hero">
        <CornerDecorations src={cornerDecoration} />
        <div className="story-card story-panel story-card--hero w-full text-center">
          <div className="relative z-20">
            <div className="story-eyebrow">{t("hero.eyebrow")}</div>
            {couplePhoto ? (
              <div className="mx-auto" style={{ position: "relative", width: "min(70vw, 400px)", aspectRatio: "1/1" }}>
                {photoLoaded && <div className="hero-couple-photo-ring" />}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: photoLoaded ? 1 : 0,
                    transition: "opacity 0.5s ease",
                    borderRadius: "50%",
                    overflow: "hidden",
                    WebkitMaskImage: "radial-gradient(circle at center, black 60%, transparent 100%)",
                    maskImage: "radial-gradient(circle at center, black 60%, transparent 100%)",
                  }}
                >
                  <img
                    src={couplePhoto}
                    alt={t("hero.couplePhotoAlt")}
                    onLoad={() => setPhotoLoaded(true)}
                    onError={() => setPhotoLoaded(true)}
                    fetchPriority="high"
                    className="w-full h-full object-cover"
                  />
                </div>
                <LoadingOverlay visible={!photoLoaded} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "1rem 1rem 2rem",
                    background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
                    borderRadius: "50%",
                    overflow: "hidden",
                    WebkitMaskImage: "radial-gradient(circle at center, black 60%, transparent 100%)",
                    maskImage: "radial-gradient(circle at center, black 60%, transparent 100%)",
                  }}
                >
                  <h1
                    className="story-title story-title--couple"
                    style={{
                      position: "relative",
                      zIndex: 11,
                      color: "#fff",
                      textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                      fontSize: "clamp(1.2rem, 5cqi, 2.2rem)",
                      margin: 0,
                      maxWidth: "80%",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {firstName || ""}
                    <span className="story-title__ampersand"> & </span>
                    {secondName || ""}
                  </h1>
                </div>
              </div>
            ) : (
              <div className="relative mx-auto w-fit">
                <h1 className="story-title story-title--couple">
                  {firstName || ""}
                  <span className="story-title__ampersand"> & </span>
                  {secondName || ""}
                </h1>
              </div>
            )}
            <p className="story-copy mt-3 sm:mt-4">{inviteMessage}</p>
            {godparent1 && godparent2 ? (
              <p
                className="story-copy mt-2"
                style={{
                  fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)",
                  opacity: 0.85,
                  fontStyle: "italic",
                  letterSpacing: "0.04em",
                  color: "var(--invite-copy-color, #c8b898)",
                  textShadow:
                    "0 0 8px color-mix(in srgb, var(--flower-accent, #d8b24a) 20%, transparent), 0 0 20px color-mix(in srgb, var(--flower-accent, #d8b24a) 8%, transparent)",
                  animation: "godparent-glow 3s ease-in-out infinite",
                }}
              >
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
                      const vals: number[] = [
                        countdown.years ?? 0,
                        countdown.months ?? 0,
                        countdown.days ?? 0,
                        countdown.hours ?? 0,
                        countdown.minutes ?? 0,
                        countdown.seconds ?? 0,
                      ];
                      const keys = ["year", "month", "day", "hour", "minute", "second"];
                      let start = vals.findIndex((v) => v > 0);
                      if (start === -1) start = vals.length - 1;
                      // Recorta los ceros finales pero mantiene los intermedios
                      // (p. ej. "2 h · 0 min · 10 s").
                      let end = vals.length;
                      while (end > start && vals[end - 1] === 0) end--;
                      let shown = vals.slice(start, end).map((v, i) => t(`countdown.${keys[start + i]}`, { count: v }));
                      if (shown.length === 0) shown = [t(`countdown.${keys[vals.length - 1]}`, { count: 0 })];
                      return shown.join(" · ");
                    })()}
                  </p>
                ) : (
                  // El estado final se anuncia una vez (no el tick de cada
                  // segundo, que sería molesto para lectores de pantalla).
                  <p
                    className="mt-1 text-[clamp(1.5rem,4vw,2.5rem)] leading-tight font-serif text-boda-texto"
                    aria-live="assertive"
                  >
                    {t("hero.todayIsTheDay")}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
});

export default HeroSection;
