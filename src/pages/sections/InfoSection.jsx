import { memo } from "react";
import { useTranslation } from "react-i18next";

const KNOWN_KIDS = new Set(["playArea", "supervised", "adultOnly"]);

const InfoSection = memo(function InfoSection({ style, className, weddingSchedule, weddingDressCode, kidsPolicy }) {
  const { t } = useTranslation();
  const kidsLabel = kidsPolicy && KNOWN_KIDS.has(kidsPolicy) ? t("kidsPolicy.options." + kidsPolicy) : kidsPolicy;
  return (
    <section
      data-story-section="info"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <>
          <p className="story-eyebrow">{t("info.sectionLabel")}</p>
          <h2 className="story-title">{t("info.scheduleTitle")}</h2>
          {(weddingSchedule || "").trim() ? (
            <div className="mt-4 space-y-1 text-left">
              {weddingSchedule.split("\n").filter(Boolean).map((line, i) => {
                const timeMatch = line.match(/^(\d{1,2}:\d{2})\s*(.*)/);
                return (
                  <div key={i} className="flex gap-3 items-baseline">
                    {timeMatch ? (
                      <>
                        <span className="shrink-0 font-semibold text-boda-texto tabular-nums">{timeMatch[1]}</span>
                        <span className="text-boda-texto/80">{timeMatch[2]}</span>
                      </>
                    ) : (
                      <span className="text-boda-texto/80">{line}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="story-copy" style={{ fontStyle: "italic" }}>
              {t("info.schedulePending")}
            </p>
          )}
        </>
        <>
          <div className="story-divider" />
          <p className="story-eyebrow">{t("info.dressCodeLabel")}</p>
          <h3 className="story-subheading">{t("info.dressCodeTitle")}</h3>
          {weddingDressCode ? (
            <p className="story-copy">{weddingDressCode}</p>
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
    </section>
  );
});

export default InfoSection;
