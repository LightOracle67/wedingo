import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CornerDecorations from "../../components/CornerDecorations";

const KNOWN_KIDS = new Set(["playArea", "supervised"]);

interface ScheduleEvent {
  time: string;
  text: string;
  emoji?: string;
}

/** Parsea "HH:mm" → {h, m}. Cualquier formato fuera de ese patrón (o hora
 *  imposible) devuelve null: un texto como "al atardecer" no debe romper el
 *  itinerario, solo se muestra sin cuenta atrás. */
function parseClock(time: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

/** Diferencia en minutos entre dos instantes (positiva si `from` es futuro). */
function diffMinutes(from: number, to: number) {
  return Math.round((from - to) / 60000);
}

const InfoSection = memo(function InfoSection({
  style,
  className,
  weddingScheduleEvents,
  weddingDressCode,
  weddingDressCodeCustom,
  kidsPolicy,
  cornerDecoration,
  weddingDate,
}: {
  style?: React.CSSProperties;
  className?: string;
  weddingScheduleEvents?: string;
  weddingDressCode?: string;
  weddingDressCodeCustom?: string;
  kidsPolicy?: string;
  cornerDecoration?: string;
  weddingDate?: Date | null;
}) {
  const { t } = useTranslation();
  const kidsLabel = kidsPolicy && KNOWN_KIDS.has(kidsPolicy) ? t("kidsPolicy.options." + kidsPolicy) : kidsPolicy;

  const events: ScheduleEvent[] = useMemo(() => {
    if (!weddingScheduleEvents) return [];
    try {
      const parsed = JSON.parse(weddingScheduleEvents);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (e): e is ScheduleEvent =>
              !!e &&
              typeof e === "object" &&
              typeof (e as ScheduleEvent).time === "string" &&
              typeof (e as ScheduleEvent).text === "string",
          )
          .slice(0, 10);
      }
    } catch {
      return [];
    }
    return [];
  }, [weddingScheduleEvents]);

  // Hora "actual" solo relevante el día de la boda: el intervalo se arranca
  // únicamente si hoy coincide con la fecha del evento (para que una sección
  // de "Sobre los invitados" sin fecha no mantenga un setInterval vivo).
  const [now, setNow] = useState(() => Date.now());
  const isWeddingDay = !!weddingDate && weddingDate.toDateString() === new Date(now).toDateString();
  useEffect(() => {
    if (!isWeddingDay) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [isWeddingDay]);

  /** Evento "actual": el último cuyo inicio ya pasó y antes del siguiente.
   *  Sin fecha de boda o fuera del día del evento no hay estado en vivo
   *  (la agenda se muestra siempre, como lista estática segura). Se mantiene
   *  el ORDEN ORIGINAL de los eventos (para emparejar el badge con su fila);
   *  la selección del actual se calcula sobre una copia ordenada. */
  const scheduleState = useMemo(() => {
    if (!weddingDate || !isWeddingDay) return null;
    // timed mantiene la MISMA longitud/orden que events (null si el evento no
    // tiene hora parseable): así el badge se empareja con su fila (i).
    const timed: Array<{ ev: ScheduleEvent; start: number } | null> = events.map((ev) => {
      const parsed = parseClock(ev.time);
      if (!parsed) return null;
      const start = new Date(weddingDate);
      start.setHours(parsed.h, parsed.m, 0, 0);
      return { ev, start: start.getTime() };
    });
    const valid = timed.filter((x): x is { ev: ScheduleEvent; start: number } => x !== null);
    if (valid.length === 0) return null;
    const sorted = [...valid].sort((a, b) => a.start - b.start);
    const nowTs = now;
    const sortedIndex = sorted.findIndex((e, i) => {
      const inWindow = nowTs >= e.start && (i === sorted.length - 1 || nowTs < sorted[i + 1]!.start);
      // Como un evento puede durar más de la ventana hasta el siguiente, se
      // considera actual hasta 2h después de empezar (una boda no dura 10 min).
      return inWindow || (nowTs >= e.start && nowTs - e.start < 7200000);
    });
    // Índice del evento actual en el ORDEN ORIGINAL (null si ninguno).
    const currentIndex = sortedIndex === -1 ? null : events.indexOf(sorted[sortedIndex]!.ev);
    return { timed, currentIndex };
  }, [events, weddingDate, isWeddingDay, now]);

  return (
    <section
      data-story-section="info"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card-wrap">
        <CornerDecorations src={cornerDecoration} />
        <div className="story-card story-panel story-card--info w-full text-center">
          {events.length > 0 ? (
            <>
              <p className="story-eyebrow">{t("info.sectionLabel")}</p>
              <h2 className="story-title">{t("info.scheduleTitle")}</h2>
              <div className="mt-4 space-y-2 text-left">
                {events.map((ev, i) => {
                  const state = scheduleState?.timed[i];
                  const isCurrent = state ? scheduleState.currentIndex === i : false;
                  const parsed = state ? parseClock(ev.time) : null;
                  // Etiqueta temporal: solo cuando es el día del evento.
                  let liveLabel: string | null = null;
                  if (state && isCurrent) liveLabel = t("info.liveNow");
                  else if (state && parsed) {
                    const diff = diffMinutes(state.start, now);
                    if (diff > 0) {
                      liveLabel = diff <= 5 ? t("info.imminent") : t("info.inMin", { count: diff });
                    }
                  }
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 items-center ${isCurrent ? "agenda-item agenda-item--live" : ""}`}
                    >
                      {ev.emoji ? (
                        <span className="shrink-0 schedule-emoji" aria-hidden="true">
                          {ev.emoji}
                        </span>
                      ) : null}
                      {ev.time ? (
                        <span className="shrink-0 font-semibold text-boda-texto tabular-nums">{ev.time}</span>
                      ) : null}
                      <span className="text-boda-texto/80">{ev.text}</span>
                      {liveLabel ? (
                        <span className="agenda-badge" aria-live="polite">
                          {liveLabel}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
          <>
            <div className="story-divider" />
            <p className="story-eyebrow">{t("info.dressCodeLabel")}</p>
            <h3 className="story-subheading">{t("info.dressCodeTitle")}</h3>
            {weddingDressCode ? (
              <p className="story-copy">
                {/* "custom" muestra el texto libre de la pareja; el resto se
                    traduce desde la clave (independiente del idioma). */}
                {weddingDressCode === "custom" && weddingDressCodeCustom
                  ? weddingDressCodeCustom
                  : t(`info.dressCodeOptions.${weddingDressCode}`)}
              </p>
            ) : (
              <p className="story-copy" style={{ fontStyle: "italic" }}>
                {t("info.dressCodePending")}
              </p>
            )}
          </>
          {kidsPolicy ? (
            <>
              <div className="story-divider" />
              <p className="story-eyebrow">{t("info.kidsLabel")}</p>
              <h3 className="story-subheading">{t("info.kidsTitle")}</h3>
              <p className="story-copy whitespace-pre-line">{kidsLabel}</p>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
});

export default InfoSection;