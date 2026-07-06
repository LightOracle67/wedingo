import { memo } from "react";

const GiftsSection = memo(function GiftsSection({ style, className, giftsInfo, bankInfo }) {
  return (
    <section
      data-story-section="gifts"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Regalos</p>
        <h2 className="story-title">Tu presencia es el mejor regalo</h2>
        {giftsInfo ? (
          <p className="story-copy mt-4 whitespace-pre-line">{giftsInfo}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            La información sobre regalos se compartirá próximamente.
          </p>
        )}
        {bankInfo ? (
          <div className="mt-4 p-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--setup-field-bg) 80%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 30%, transparent)" }}>
            <p className="story-eyebrow" style={{ fontSize: "0.72rem" }}>Datos bancarios</p>
            <p className="story-note mt-1 whitespace-pre-line" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{bankInfo}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
});

export default GiftsSection;
