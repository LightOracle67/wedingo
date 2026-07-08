import { memo } from "react";
import { useTranslation } from "react-i18next";

const AccommodationSection = memo(function AccommodationSection({ style, className, accommodationInfo }) {
  const { t } = useTranslation();
  return (
    <section
      data-story-section="accommodation"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">{t("accommodation.sectionLabel")}</p>
        <h2 className="story-title">{t("accommodation.title")}</h2>
        {accommodationInfo ? (
          <p className="story-copy mt-4 whitespace-pre-line">{accommodationInfo}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            {t("accommodation.pending")}
          </p>
        )}
      </div>
    </section>
  );
});

export default AccommodationSection;
