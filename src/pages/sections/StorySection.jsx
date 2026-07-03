import { memo } from "react";

const StorySection = memo(function StorySection({ style, className, storyText }) {
  return (
    <section
      data-story-section="story"
      className={`${className} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full max-w-[min(100%,40rem)] text-center">
        <p className="story-eyebrow">Nuestra historia</p>
        <h2 className="story-title">Cómo empezó todo</h2>
        {storyText ? (
          <p className="story-copy mt-4 whitespace-pre-line">{storyText}</p>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            La historia se compartirá pronto con todos los invitados.
          </p>
        )}
      </div>
    </section>
  );
});

export default StorySection;
