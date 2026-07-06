import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const SECTIONS = {
  privacy: {
    title: "Política de Privacidad",
    content: `Responsable del tratamiento: Adrian Carrasco Lopez. Finalidad: gestión de invitaciones de boda, confirmación de asistencia y comunicación de eventos.

Base legal: ejecución de un acuerdo (art. 6.1.b RGPD) y consentimiento del interesado (art. 6.1.a RGPD). Los datos de salud (alergias) se tratan con consentimiento explícito (art. 9.2.a RGPD).

Datos recogidos: nombre, datos de contacto, preferencias alimentarias, mensajes voluntarios, imágenes subidas, datos bancarios si se proporcionan voluntariamente.

Destinatarios: Google LLC (Firebase, Google Cloud Platform) con sede en EE.UU. Las transferencias internacionales se amparan en las Cláusulas Contractuales Tipo (SCC) suscritas con Google.

Plazo de conservación: los datos se conservan hasta 12 meses después de la fecha del evento o hasta que el usuario solicite su eliminación.

Derechos: acceso, rectificación, supresión, limitación, portabilidad y oposición. Ejercerlos escribiendo a adriancl2001@gmail.com.

Puede presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD).`,
  },
  terms: {
    title: "Términos de Uso",
    content: `El uso de Wedingo implica la aceptación de estos términos. Wedingo es una plataforma para crear y gestionar invitaciones de boda.

El usuario se compromete a no utilizar la plataforma para fines ilícitos ni para enviar contenido ofensivo.

Wedingo no se hace responsable del contenido generado por los usuarios ni del uso que los invitados hagan de sus datos personales.

Nos reservamos el derecho de modificar estos términos. Los cambios serán notificados a través de la plataforma.`,
  },
  legal: {
    title: "Aviso Legal",
    content: `En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa:

Responsable: Adrian Carrasco Lopez
Email: adriancl2001@gmail.com
Finalidad del sitio web: plataforma de invitaciones de boda personalizadas.

Este sitio web utiliza Firebase (Google LLC) como infraestructura de hosting y almacenamiento.`,
  },
};

export default function LegalPage() {
  const { section = "privacy" } = useParams();
  const active = SECTIONS[section] || SECTIONS.privacy;

  const tabs = useMemo(() => [
    { key: "privacy", label: "Privacidad" },
    { key: "terms", label: "Términos" },
    { key: "legal", label: "Aviso Legal" },
  ], []);

  return (
    <div className="setup-layout">
      <section className="setup-card allow-select">
        <nav style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <a key={tab.key} href={`/legal/${tab.key}`}
              style={{
                padding: "0.4rem 0.8rem", borderRadius: "0.5rem", fontSize: "0.85rem",
                textDecoration: "none", fontWeight: 600,
                color: section === tab.key ? "var(--setup-accent)" : "var(--setup-muted)",
                border: section === tab.key ? "1px solid var(--setup-accent)" : "1px solid transparent",
              }}>
              {tab.label}
            </a>
          ))}
        </nav>
        <h1 className="setup-title">{active.title}</h1>
        <div style={{ marginTop: "1rem", color: "var(--setup-subtitle)", fontSize: "0.95rem", lineHeight: 1.7, whiteSpace: "pre-line" }}>
          {active.content}
        </div>
      </section>
    </div>
  );
}
