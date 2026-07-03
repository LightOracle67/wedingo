import { useNavigate } from "react-router-dom";
import { generateInviteToken } from "../lib/utils";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleCreate = () => {
    const token = generateInviteToken();
    sessionStorage.setItem("weddingo_invite_token", token);
    navigate(`/${token}/setup`);
  };

  return (
    <div className="app-scene">
      <section className="story-section story-section--is-active landing-bg flex min-h-screen items-center justify-center px-4">
        <div className="story-panel story-panel--hero w-full max-w-md text-center">
          <h1 className="hero-title invite-title text-[clamp(2.5rem,8vw,4.5rem)] leading-tight font-serif text-boda-texto">
            Wedingo - Invitaciones de boda
          </h1>
          <p className="mt-4 text-[clamp(1rem,3vw,1.35rem)] leading-relaxed font-serif text-boda-texto/80">
            Crea y comparte tu invitación de boda personalizada.
          </p>
          <div className="story-divider my-6" />
          <p className="text-[0.95rem] leading-relaxed text-boda-texto/60">
            Gestiona los datos de tu invitación, comparte un enlace único con tus invitados y recibe sus confirmaciones de asistencia.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" className="setup-button text-sm" onClick={handleCreate}>
              Crear tu invitación
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
