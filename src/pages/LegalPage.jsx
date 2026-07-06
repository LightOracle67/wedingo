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
    <div className="setup-layout">
      <section className="setup-card allow-select">
        <h1 className="setup-title" style={{ marginBottom: "1rem" }}>Información legal</h1>

        {SECTIONS.map((s) => (
          <div key={s.id} id={s.id} style={{ marginBottom: "0.75rem" }}>
            <button type="button" onClick={() => toggle(s.id)}
              style={{
                width: "100%", textAlign: "left", padding: "0.7rem 1rem",
                borderRadius: "0.7rem", border: "1px solid color-mix(in srgb, var(--setup-accent) 40%, transparent)",
                background: open === s.id ? "color-mix(in srgb, var(--setup-field-bg) 90%, transparent)" : "transparent",
                color: "var(--setup-title)", fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
              <span>{s.label}</span>
              <span style={{ transform: open === s.id ? "rotate(45deg)" : "none", transition: "transform 200ms", fontSize: "1.2rem" }}>+</span>
            </button>
            {open === s.id && (
              <div style={{
                padding: "0.75rem 1rem", color: "var(--setup-subtitle)", fontSize: "0.92rem",
                lineHeight: 1.7, whiteSpace: "pre-line", borderBottom: "1px solid color-mix(in srgb, var(--setup-accent) 20%, transparent)",
              }}>
                {s.content}
              </div>
            )}
          </div>
        ))}

        <a href="/" className="setup-button setup-button--ghost" style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.85rem", textDecoration: "none" }}>Volver</a>
      </section>
    </div>
  );
}
