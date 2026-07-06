import { memo, useRef, useState, useEffect } from "react";
import heroBackdropSrc from "../../assets/rings.png";

const HeroSection = memo(function HeroSection({ style, className, firstName, secondName, inviteMessage, countdown, couplePhoto, musicUrl, darkMode }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (darkMode === "true") {
      document.documentElement.dataset.darkMode = "true";
    } else {
      delete document.documentElement.dataset.darkMode;
    }
  }, [darkMode]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  return (
    <section
      data-story-section="hero"
      className={`${className} relative flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="invite-shell story-panel story-panel--hero relative z-10 mx-auto w-full rounded-[2rem] bg-transparent text-center shadow-2xl" style={{ maxWidth: "min(100%, 32rem)", padding: "clamp(0.6rem, 2vw, 1.2rem)", boxSizing: "border-box", overflowY: "auto" }}>
        <div className="relative z-20">
          {couplePhoto ? (
            <div className="mx-auto mb-4 w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2" style={{ borderColor: "color-mix(in srgb, var(--invite-shell-border) 80%, transparent)" }}>
              <img src={couplePhoto} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}
          <div className="relative mx-auto w-fit">
            <div className="hero-rings pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[42%]">
              <img
                src={heroBackdropSrc}
                alt=""
                aria-hidden="true"
                className="invite-rings block h-auto w-[clamp(11rem,44vw,18rem)] object-contain object-center sm:w-[clamp(13rem,34vw,20rem)]"
              />
            </div>
            <h1 className="hero-title invite-title relative z-10 text-[clamp(2rem,7vw,4.5rem)] leading-tight font-serif text-boda-texto sm:text-[clamp(2.5rem,6vw,4.75rem)] lg:text-[clamp(3rem,5vw,5.5rem)]">
              {firstName} & {secondName}
            </h1>
          </div>
          <p className="hero-message invite-copy mt-3 text-[clamp(0.95rem,2.8vw,1.25rem)] leading-relaxed font-serif text-boda-texto sm:mt-4 sm:text-[clamp(1rem,2.5vw,1.35rem)]">
            {inviteMessage}
          </p>
          {countdown ? (
            <div className="hero-countdown mt-6">
              <p className="text-[clamp(0.8rem,2.2vw,1rem)] font-sans tracking-widest uppercase text-boda-texto/60">
                {countdown.expired ? "Hoy es la boda" : "Faltan"}
              </p>
              {!countdown.expired ? (
                <p className="text-[clamp(2rem,6vw,3.5rem)] leading-tight font-serif tracking-wider text-boda-texto">
                  {countdown.days > 0 ? `${countdown.days} día${countdown.days === 1 ? "" : "s"}` : ""}
                  {countdown.days > 0 && countdown.hours > 0 ? " y " : ""}
                  {countdown.days === 0 || countdown.hours > 0 ? `${countdown.hours} hora${countdown.hours === 1 ? "" : "s"}` : ""}
                  {countdown.days === 0 && countdown.hours === 0 ? `${countdown.minutes} minuto${countdown.minutes === 1 ? "" : "s"}` : ""}
                </p>
              ) : (
                <p className="mt-1 text-[clamp(1.5rem,4vw,2.5rem)] leading-tight font-serif text-boda-texto">¡Hoy es el gran día!</p>
              )}
            </div>
          ) : null}
          {musicUrl ? (
            <div className="mt-4">
              <audio ref={audioRef} src={musicUrl} loop />
              <button type="button" onClick={toggleMusic} className="setup-button setup-button--ghost setup-button--compact" style={{ fontSize: "0.8rem" }}>
                {playing ? "⏸ Pausar música" : "▶ Reproducir música"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
});

export default HeroSection;
