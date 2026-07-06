import { useState } from "react";
import { useSearchParams } from "react-router-dom";

const SECTIONS = [
  {
    id: "privacy",
    label: "Política de Privacidad",
    content: `Responsable del tratamiento: Adrian Carrasco Lopez. Finalidad: gestión de invitaciones de boda, confirmación de asistencia y comunicación de eventos.

Base legal: ejecución de un acuerdo (art. 6.1.b RGPD) y consentimiento del interesado (art. 6.1.a RGPD). Los datos de salud (alergias) se tratan con consentimiento explícito (art. 9.2.a RGPD).

Datos recogidos: nombre, datos de contacto, preferencias alimentarias, mensajes voluntarios, imágenes subidas, datos bancarios si se proporcionan voluntariamente.

Destinatarios: Google LLC (Firebase, Google Cloud Platform) con sede en EE.UU. Las transferencias internacionales se amparan en las Cláusulas Contractuales Tipo (SCC) suscritas con Google.

Plazo de conservación: los datos se conservan hasta 12 meses después de la fecha del evento o hasta que el usuario solicite su eliminación.

Derechos: acceso, rectificación, supresión, limitación, portabilidad y oposición. Ejercerlos escribiendo a adriancl2001@gmail.com o desde el panel de administración de tu invitación.

Puede presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD).`,
  },
  {
    id: "terms",
    label: "Términos de Uso",
    content: `El uso de Wedingo implica la aceptación de estos términos. Wedingo es una plataforma para crear y gestionar invitaciones de boda.

El usuario se compromete a no utilizar la plataforma para fines ilícitos ni para enviar contenido ofensivo.

Wedingo no se hace responsable del contenido generado por los usuarios ni del uso que los invitados hagan de sus datos personales.

Nos reservamos el derecho de modificar estos términos. Los cambios serán notificados a través de la plataforma.`,
  },
  {
    id: "legal",
    label: "Aviso Legal",
    content: `En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa:

Responsable: Adrian Carrasco Lopez
Email: adriancl2001@gmail.com
Finalidad del sitio web: plataforma de invitaciones de boda personalizadas.

Este sitio web utiliza Firebase (Google LLC) como infraestructura de hosting y almacenamiento.`,
  },
];

export default function LegalPage() {
  const [params] = useSearchParams();
  const [open, setOpen] = useState(() => params.get("s") || "");
  const toggle = (id) => setOpen((prev) => (prev === id ? "" : id));

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "clamp(1rem, 3vw, 2rem)", boxSizing: "border-box",
    }}>
      <div style={{
        width: "min(100%, 42rem)", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto",
        background: "rgba(255, 255, 255, 0.12)", backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)", borderRadius: "1.2rem",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {SECTIONS.map((s) => (
          <div key={s.id}>
            <button type="button" onClick={() => toggle(s.id)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "1rem 1.2rem", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: "transparent", color: "#f0e8d8", cursor: "pointer",
                fontSize: "1rem", fontWeight: 600, fontFamily: "var(--font-body)",
                letterSpacing: "0.02em", transition: "background 200ms",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span>{s.label}</span>
              <span style={{
                transform: open === s.id ? "rotate(135deg)" : "rotate(0deg)",
                transition: "transform 300ms ease", fontSize: "1.1rem", opacity: 0.5,
              }}>+</span>
            </button>
            <div style={{
              maxHeight: open === s.id ? "500px" : "0px", overflow: "hidden",
              transition: "max-height 400ms ease, opacity 300ms ease",
              opacity: open === s.id ? 1 : 0,
            }}>
              <div style={{
                padding: "0.8rem 1.2rem 1.2rem", color: "rgba(240, 232, 216, 0.8)",
                fontSize: "0.92rem", lineHeight: 1.7, whiteSpace: "pre-line",
                fontFamily: "var(--font-body)",
              }}>
                {s.content}
              </div>
            </div>
          </div>
        ))}
        <div style={{ padding: "0.8rem 1.2rem", textAlign: "center" }}>
          <a href="/" style={{
            color: "rgba(240, 232, 216, 0.5)", fontSize: "0.85rem",
            textDecoration: "underline", transition: "color 200ms",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "rgba(240, 232, 216, 0.8)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "rgba(240, 232, 216, 0.5)"}
          >Volver</a>
        </div>
      </div>
    </div>
  );
}
