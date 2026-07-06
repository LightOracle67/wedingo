import { memo } from "react";

const TransportSection = memo(function TransportSection({ style, className, transportInfo }) {
  return (
    <section
      data-story-section="transport"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Transporte</p>
        <h2 className="story-title">Cómo llegar</h2>
        {transportInfo ? (
          <p className="story-copy mt-4 whitespace-pre-line">{transportInfo}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            La información sobre transporte se compartirá próximamente.
          </p>
        )}
      </div>
    </section>
  );
});

export default TransportSection;
