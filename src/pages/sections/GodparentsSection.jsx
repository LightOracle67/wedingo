import { memo } from "react";

const GodparentsSection = memo(function GodparentsSection({ style, className, godparents }) {
  return (
    <section
      data-story-section="godparents"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Padrinos</p>
        <h2 className="story-title">Nuestros padrinos</h2>
        {godparents ? (
          <p className="story-copy mt-4 whitespace-pre-line">{godparents}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            Pronto compartiremos los nombres de nuestros padrinos.
          </p>
        )}
      </div>
    </section>
  );
});

export default GodparentsSection;
