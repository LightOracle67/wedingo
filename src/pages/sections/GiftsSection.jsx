import { memo } from "react";
import { useTranslation } from "react-i18next";

const GiftsSection = memo(function GiftsSection({ style, className, giftsInfo, bankInfo }) {
  const { t } = useTranslation();
  return (
    <section
      data-story-section="gifts"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">{t("gifts.sectionLabel")}</p>
        <h2 className="story-title">{t("gifts.title")}</h2>
        {giftsInfo ? (
          <p className="story-copy mt-4 whitespace-pre-line">{giftsInfo}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            {t("gifts.pending")}
          </p>
        )}
        {bankInfo ? (
          <div className="mt-4 p-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--setup-field-bg) 80%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 30%, transparent)" }}>
            <p className="story-eyebrow" style={{ fontSize: "0.72rem" }}>{t("gifts.bankInfo")}</p>
            <p className="story-note mt-1 whitespace-pre-line" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{bankInfo}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
});

export default GiftsSection;
