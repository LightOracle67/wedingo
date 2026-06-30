import { useEffect, useState } from "react";

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [slideOffset, setSlideOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const updateSlideOffset = (clientX, clientY, currentTarget) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    setSlideOffset({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    });
  };

  const handlePointerMove = (event) => {
    updateSlideOffset(event.clientX, event.clientY, event.currentTarget);
  };

  const handleTouchMove = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    updateSlideOffset(touch.clientX, touch.clientY, event.currentTarget);
  };

  const resetSlideOffset = () => {
    setSlideOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-boda-fondo px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetSlideOffset}
      onTouchMove={handleTouchMove}
      onTouchEnd={resetSlideOffset}
    >
      <div
        className={`pointer-events-none absolute left-[-0.5rem] top-0 z-0 wedding-decoration wedding-decoration--left ${
          isReady ? "animate-branch-in-left" : ""
        }`}
        style={{
          transform: `translate3d(${slideOffset.x * -8}px, ${slideOffset.y * -6}px, 0) rotate(180deg)`,
        }}
      >
        <img
          src="/eucalyptus.png"
          alt="Eucalyptus branch decoration"
          className="wedding-decoration__image"
          draggable={false}
        />
      </div>
      <div
        className={`pointer-events-none absolute right-[-0.5rem] bottom-[-0.5rem] z-0 wedding-decoration wedding-decoration--right ${
          isReady ? "animate-branch-in-right" : ""
        }`}
        style={{
          transform: `translate3d(${slideOffset.x * 8}px, ${slideOffset.y * 6}px, 0)`,
        }}
      >
        <img
          src="/eucalyptus.png"
          alt="Eucalyptus branch decoration"
          className="wedding-decoration__image"
          draggable={false}
        />
      </div>

      <div
        className={`relative z-10 mx-auto w-full max-w-[min(100%,38rem)] text-center rounded-[2rem] bg-white/10 px-4 py-6 shadow-2xl backdrop-blur-xl sm:px-8 sm:py-10 lg:px-10 lg:py-12 ${
          isReady ? "animate-card-reveal" : "opacity-0"
        }`}
        style={{
          transform: `translate3d(${slideOffset.x * 12}px, ${slideOffset.y * 8}px, 0)`,
        }}
      >
        <h1 className={`inline-block bg-black px-3 py-2 text-[clamp(2rem,7vw,4.5rem)] leading-tight font-serif text-boda-texto drop-shadow-[0_0_16px_rgba(216,178,74,0.45)] sm:px-4 sm:py-3 sm:text-[clamp(2.5rem,6vw,4.75rem)] lg:text-[clamp(3rem,5vw,5.5rem)] [text-shadow:0_2px_3px_rgba(0,0,0,0.75)] ${
          isReady ? "animate-item-up delay-120" : "opacity-0"
        }`}>
          Antonio & Jose
        </h1>
        <p className={`mt-3 text-[clamp(0.95rem,2.8vw,1.25rem)] leading-relaxed text-boda-texto/80 sm:mt-4 sm:text-[clamp(1rem,2.5vw,1.35rem)] ${
          isReady ? "animate-item-up delay-220" : "opacity-0"
        }`}>
          Nos encantaría compartir este día tan especial contigo.
        </p>
        <p className={`mt-2 text-[clamp(0.95rem,2.8vw,1.2rem)] leading-relaxed text-boda-texto/80 sm:mt-3 sm:text-[clamp(1rem,2.4vw,1.3rem)] ${
          isReady ? "animate-item-up delay-300" : "opacity-0"
        }`}>
          12 de septiembre de 2027
        </p>

        <div className={`mt-5 sm:mt-8 ${isReady ? "animate-item-up delay-380" : "opacity-0"}`}>
          <button className="rounded-full bg-boda-dorado px-4 py-2 text-[clamp(0.85rem,2.2vw,1rem)] text-white transition duration-500 hover:-translate-y-0.5 hover:opacity-90 sm:px-6 sm:py-2.5">
            Confirmar asistencia
          </button>
        </div>
      </div>
    </div>
  );
}