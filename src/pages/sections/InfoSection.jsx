import { memo } from "react";

const InfoSection = memo(function InfoSection({ style, className, weddingSchedule, weddingDressCode, kidsPolicy }) {
  return (
    <section
      data-story-section="info"
      className={`${className} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full max-w-[min(100%,40rem)] text-center">
        <>
          <p className="story-eyebrow">Itinerario</p>
          <h2 className="story-title">Horario de la celebración</h2>
          {weddingSchedule ? (
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
              El horario detallado se compartirá próximamente con todos los invitados.
            </p>
          )}
        </>
        <>
          <div className="story-divider" />
          <p className="story-eyebrow">Código de vestimenta</p>
          <h3 className="story-subheading">Etiqueta sugerida</h3>
          {weddingDressCode ? (
            <p className="story-copy">{weddingDressCode}</p>
          ) : (
            <p className="story-copy" style={{ fontStyle: "italic" }}>
              El código de vestimenta se comunicará más adelante.
            </p>
          )}
        </>
        {kidsPolicy ? (
          <>
            <div className="story-divider" />
            <p className="story-eyebrow">Niños</p>
            <h3 className="story-subheading">Sobre los más pequeños</h3>
            <p className="story-copy whitespace-pre-line">{kidsPolicy}</p>
          </>
        ) : null}
      </div>
    </section>
  );
});

export default InfoSection;
