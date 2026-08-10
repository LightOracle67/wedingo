import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LoadingOverlay from "../../components/LoadingOverlay";
import CornerDecorations from "../../components/CornerDecorations";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/** Estado de la cuenta atrás (años/meses/días + horas/min/seg). */
export interface CountdownState {
  years?: number;
  months?: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Calcula el countdown entre `target` y `now` (función pura, sin estado). */
function computeCountdown(target: Date, now: Date): CountdownState {
  if (target.getTime() <= now.getTime()) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  let years = target.getFullYear() - now.getFullYear();
  let months = target.getMonth() - now.getMonth();
  let days = target.getDate() - now.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(target.getFullYear(), target.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const hours = Math.floor(diffMs / 3_600_000) % 24;
  const minutes = Math.floor(diffMs / 60_000) % 60;
  const seconds = Math.floor(diffMs / 1000) % 60;
  return { years, months, days, hours, minutes, seconds, expired: false };
}

interface HeroSectionProps {
  style?: React.CSSProperties;
  className?: string;
  firstName?: string;
  secondName?: string;
  inviteMessage?: string;
  /** Fecha del evento: el countdown vive AQUÍ (no en la página) para que el
   *  tick de 1s solo re-renderice esta sección, no todo el árbol. */
  weddingDate?: Date | null;
  couplePhoto?: string;
  godparent1?: string;
  godparent2?: string;
  cornerDecoration?: string;
  /** Sello de verificación (solo lo fija el superadmin). */
  verified?: string;
  /** Token de la invitación (para la prueba social en vivo y el recuerdo). */
  inviteToken?: string;
}

const HeroSection = memo(function HeroSection({
  style,
  className,
  firstName,
  secondName,
  inviteMessage,
  weddingDate,
  couplePhoto,
  godparent1,
  godparent2,
  cornerDecoration,
  verified,
  inviteToken,
}: HeroSectionProps) {
  const { t } = useTranslation();
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const reducedMotion = useReducedMotion();

  // Prueba social en vivo: nº de invitados que ya confirmaron (lectura en
  // tiempo real del contador rsvpResponses/{token}). Solo si hay confirmados.
  const [confirmedCount, setConfirmedCount] = useState(0);
  useEffect(() => {
    if (!inviteToken) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    const init = async () => {
      const { doc, onSnapshot } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");
      unsub = onSnapshot(
        doc(db, "rsvpResponses", inviteToken),
        (snap) => {
          if (cancelled) return;
          const n = Number(snap.data()?.count || 0);
          setConfirmedCount(n > 0 ? n : 0);
        },
        () => {},
      );
    };
    void init();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [inviteToken]);

  // Inicialización síncrona: el countdown se pinta en el primer render (evita
  // el CLS de que el bloque del hero aparezca tras el mount).
  const [countdown, setCountdown] = useState<CountdownState | null>(() =>
    weddingDate ? computeCountdown(weddingDate, new Date()) : null,
  );
  // Boda ya pasada → la invitación se convierte en "recuerdo" (agradecimiento).
  const weddingPassed = weddingDate ? weddingDate.getTime() < Date.now() : false;

  /**
   * Actualiza la cuenta regresiva cada segundo SOLO en esta sección. Se pausa
   * al ocultar la pestaña, se detiene al expirar y no itera con menos
   * movimiento (la página ya no se re-renderiza entera cada segundo).
   */
  useEffect(() => {
    if (!weddingDate) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      const next = computeCountdown(weddingDate, new Date());
      setCountdown(next);
      // Una vez expirado se detiene el intervalo (no re-renderizar el hero
      // cada segundo para siempre).
      if (next.expired && id) {
        clearInterval(id);
        id = null;
      }
    };
    tick();
    if (reducedMotion) return;
    id = setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.hidden && id) {
        clearInterval(id);
        id = null;
      } else if (!document.hidden && !id) {
        tick();
        id = setInterval(tick, 1000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [weddingDate, reducedMotion]);

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
            {verified === "true" ? (
              <p
                className="hero-verified"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  margin: "0.4rem 0 0",
                  padding: "0.25rem 0.7rem",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--setup-accent)",
                  border: "1px solid color-mix(in srgb, var(--setup-accent) 45%, transparent)",
                  background: "color-mix(in srgb, var(--setup-accent) 12%, transparent)",
                }}
              >
                ✓ {t("hero.verifiedBadge")}
              </p>
            ) : null}
            {confirmedCount > 0 && !weddingPassed ? (
              <p
                className="hero-rsvp-live"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  margin: "0.4rem 0 0",
                  padding: "0.25rem 0.8rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  color: "var(--invite-copy-color, #c3b193)",
                  border: "1px solid color-mix(in srgb, var(--setup-accent) 30%, transparent)",
                  background: "color-mix(in srgb, var(--setup-accent) 10%, transparent)",
                }}
              >
                {t("hero.liveConfirmed", { count: confirmedCount })}
              </p>
            ) : null}
            {weddingPassed ? (
              <p
                className="hero-thanks"
                style={{
                  margin: "0.5rem auto 0",
                  maxWidth: "26rem",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  color: "var(--invite-copy-color, #c3b193)",
                }}
              >
                {t("hero.thanksPost")}
              </p>
            ) : null}
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
