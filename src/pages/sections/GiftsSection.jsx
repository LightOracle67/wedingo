import { memo } from "react";

const GiftsSection = memo(function GiftsSection({ style, className, giftsInfo }) {
  return (
    <section
      data-story-section="gifts"
      className={`${className} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full max-w-[min(100%,40rem)] text-center">
        <p className="story-eyebrow">Regalos</p>
        <h2 className="story-title">Tu presencia es el mejor regalo</h2>
        {giftsInfo ? (
          <p className="story-copy mt-4 whitespace-pre-line">{giftsInfo}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            La información sobre regalos se compartirá próximamente.
          </p>
        )}
      </div>
    </section>
  );
});

export default GiftsSection;
