import { memo } from "react";

const AccommodationSection = memo(function AccommodationSection({ style, className, accommodationInfo }) {
  return (
    <section
      data-story-section="accommodation"
      className={`${className} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full max-w-[min(100%,40rem)] text-center">
        <p className="story-eyebrow">Alojamiento</p>
        <h2 className="story-title">Dónde alojarse</h2>
        {accommodationInfo ? (
          <p className="story-copy mt-4 whitespace-pre-line">{accommodationInfo}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            La información sobre alojamiento se compartirá próximamente.
          </p>
        )}
      </div>
    </section>
  );
});

export default AccommodationSection;
