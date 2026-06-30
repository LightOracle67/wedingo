export default function App() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-boda-fondo px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="pointer-events-none absolute left-[-0.5rem] top-0 z-0 wedding-decoration wedding-decoration--left">
        <img
          src="/eucalyptus.png"
          alt="Eucalyptus branch decoration"
          className="wedding-decoration__image"
        />
      </div>
      <div className="pointer-events-none absolute right-[-0.5rem] bottom-[-0.5rem] z-0 wedding-decoration wedding-decoration--right">
        <img
          src="/eucalyptus.png"
          alt="Eucalyptus branch decoration"
          className="wedding-decoration__image"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[min(100%,38rem)] text-center rounded-[2rem] bg-white/10 px-4 py-6 shadow-2xl backdrop-blur-xl sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <h1 className="inline-block bg-black px-3 py-2 text-[clamp(2rem,7vw,4.5rem)] leading-tight font-serif text-boda-texto drop-shadow-[0_0_16px_rgba(216,178,74,0.45)] sm:px-4 sm:py-3 sm:text-[clamp(2.5rem,6vw,4.75rem)] lg:text-[clamp(3rem,5vw,5.5rem)] [text-shadow:0_2px_3px_rgba(0,0,0,0.75)]">
          Antonio & Jose
        </h1>
        <p className="mt-3 text-[clamp(0.95rem,2.8vw,1.25rem)] leading-relaxed text-boda-texto/80 sm:mt-4 sm:text-[clamp(1rem,2.5vw,1.35rem)]">
          Nos encantaría compartir este día tan especial contigo.
        </p>
        <p className="mt-2 text-[clamp(0.95rem,2.8vw,1.2rem)] leading-relaxed text-boda-texto/80 sm:mt-3 sm:text-[clamp(1rem,2.4vw,1.3rem)]">
          12 de septiembre de 2027
        </p>

        <div className="mt-5 sm:mt-8">
          <button className="rounded-full bg-boda-dorado px-4 py-2 text-[clamp(0.85rem,2.2vw,1rem)] text-white transition hover:opacity-90 sm:px-6 sm:py-2.5">
            Confirmar asistencia
          </button>
        </div>
      </div>
    </div>
  );
}