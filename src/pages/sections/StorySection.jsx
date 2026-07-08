import { memo } from "react";
import { useTranslation } from "react-i18next";

const StorySection = memo(function StorySection({ style, className, storyText }) {
  const { t } = useTranslation();
  return (
    <section
      data-story-section="story"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">{t("story:sectionLabel")}</p>
        <h2 className="story-title">{t("story:title")}</h2>
        {storyText ? (
          <p className="story-copy mt-4 whitespace-pre-line">{storyText}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            {t("story:pending")}
          </p>
        )}
      </div>
    </section>
  );
});

export default StorySection;
