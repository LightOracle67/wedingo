import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import heroBackdropSrc from "../../assets/rings.png";

const HeroSection = memo(function HeroSection({ style, className, firstName, secondName, inviteMessage, countdown, couplePhoto, musicUrl, godparent1, godparent2 }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showVolume, setShowVolume] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onError = () => { setAudioLoading(false); setAudioError(true); };
    const onCanPlay = () => { setAudioLoading(false); setAudioError(false); };
    const onEnded = () => setPlaying(false);
    el.addEventListener("error", onError);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("error", onError);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEnded);
    };
  }, [musicUrl]);

  const handleVolume = useCallback((e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleMusic = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      setAudioError(false);
      setAudioLoading(true);
      el.play().then(() => { setPlaying(true); setAudioLoading(false); }).catch(() => { setAudioLoading(false); setAudioError(true); });
    }
  }, [playing]);

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
                alt={t("hero.couplePhotoAlt")}
                aria-hidden="true"
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
                <p className="text-[clamp(2rem,6vw,3.5rem)] leading-tight font-serif tracking-wider text-boda-texto">
                  {countdown.days > 0 && countdown.hours > 0
                    ? t("hero.daysAndHours", { days: countdown.days, hours: countdown.hours })
                    : countdown.days > 0
                      ? t("hero.days", { days: countdown.days })
                      : countdown.hours > 0
                        ? t("hero.hours", { hours: countdown.hours })
                        : t("hero.minutes", { minutes: countdown.minutes })}
                </p>
              ) : (
                <p className="mt-1 text-[clamp(1.5rem,4vw,2.5rem)] leading-tight font-serif text-boda-texto">{t("hero.todayIsTheDay")}</p>
              )}
            </div>
          ) : null}
          {musicUrl ? (
            <div className="mt-4">
              <audio ref={audioRef} src={musicUrl} loop preload="auto" />
              {audioError ? (
                <p className="setup-help" style={{ color: "#e06060", fontSize: "0.75rem", marginTop: "0.3rem" }}>{t("hero.audioError")}</p>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="button" onClick={toggleMusic} disabled={audioLoading}
                      style={{
                        background: "none", border: "1px solid color-mix(in srgb, var(--setup-accent) 50%, transparent)",
                        borderRadius: "999px", width: "2.4rem", height: "2.4rem", cursor: "pointer", display: "grid", placeItems: "center",
                        color: "var(--setup-accent)", fontSize: "1rem", transition: "background 200ms",
                        opacity: audioLoading ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in srgb, var(--setup-accent) 15%, transparent)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {audioLoading ? (
                        <span style={{ width: "1rem", height: "1rem", border: "2px solid color-mix(in srgb, var(--setup-accent) 30%, transparent)", borderTopColor: "var(--setup-accent)", borderRadius: "50%", animation: "spin 800ms linear infinite" }} />
                      ) : playing ? "⏸" : "▶"}
                    </button>
                    {playing ? (
                      <span style={{ display: "flex", gap: "2px", alignItems: "center", height: "1rem" }}>
                        {[3, 5, 4, 6, 3].map((h, i) => (
                          <span key={i} style={{
                            width: "3px", height: `${h}px`, background: "var(--setup-accent)", borderRadius: "2px",
                            animation: "musicBar 600ms ease-in-out infinite alternate",
                            animationDelay: `${i * 100}ms`, opacity: 0.8,
                          }} />
                        ))}
                      </span>
                    ) : null}
                    <button type="button" onClick={() => setShowVolume((v) => !v)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--setup-muted)", fontSize: "0.85rem", padding: "0.2rem" }}>
                      {showVolume ? "🔊" : "🔉"}
                    </button>
                  </div>
                  {showVolume ? (
                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolume}
                      style={{ width: "8rem", marginTop: "0.3rem", accentColor: "var(--setup-accent)", cursor: "pointer" }}
                    />
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
});

export default HeroSection;
