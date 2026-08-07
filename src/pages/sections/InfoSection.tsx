import { memo } from "react";
import { useTranslation } from "react-i18next";
import CornerDecorations from "../../components/CornerDecorations";

const KNOWN_KIDS = new Set(["playArea", "supervised", "adultOnly"]);

interface ScheduleEvent {
  time: string;
  text: string;
  emoji?: string;
}

const InfoSection = memo(function InfoSection({
  style,
  className,
  weddingScheduleEvents,
  weddingDressCode,
  weddingDressCodeCustom,
  kidsPolicy,
  cornerDecoration,
}: {
  style?: React.CSSProperties;
  className?: string;
  weddingScheduleEvents?: string;
  weddingDressCode?: string;
  weddingDressCodeCustom?: string;
  kidsPolicy?: string;
  cornerDecoration?: string;
}) {
  const { t } = useTranslation();
  const kidsLabel = kidsPolicy && KNOWN_KIDS.has(kidsPolicy) ? t("kidsPolicy.options." + kidsPolicy) : kidsPolicy;

  const events: ScheduleEvent[] = (() => {
    if (weddingScheduleEvents) {
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
    }
    return [];
  })();

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
                {events.map((ev, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    {ev.emoji ? (
                      <span className="shrink-0 schedule-emoji" aria-hidden="true">
                        {ev.emoji}
                      </span>
                    ) : null}
                    {ev.time ? (
                      <span className="shrink-0 font-semibold text-boda-texto tabular-nums">{ev.time}</span>
                    ) : null}
                    <span className="text-boda-texto/80">{ev.text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <>
            <div className="story-divider" />
            <p className="story-eyebrow">{t("info.dressCodeLabel")}</p>
            <h3 className="story-subheading">{t("info.dressCodeTitle")}</h3>
            {weddingDressCode ? (
              <p className="story-copy">
                {weddingDressCode === "Otro" && weddingDressCodeCustom ? weddingDressCodeCustom : weddingDressCode}
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
