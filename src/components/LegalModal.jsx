import { useEffect, useRef, useState } from "react";

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

export default function LegalModal({ section, onClose }) {
  const [open, setOpen] = useState(section || "");
  const modalRef = useRef(null);

  useEffect(() => {
    if (section) setOpen(section);
  }, [section]);

  useEffect(() => {
    const prev = document.activeElement;
    modalRef.current?.focus();
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("keydown", handleKey); prev?.focus(); };
  }, [onClose]);

  const toggle = (id) => setOpen((prev) => (prev === id ? "" : id));

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Información legal">
      <div className="modal-card" ref={modalRef} onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "480px", maxHeight: "calc(100dvh - 2rem)", display: "flex", flexDirection: "column" }}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">&times;</button>
        <p className="modal-title">Información legal</p>
        <div style={{ overflowY: "auto", flex: 1, marginTop: "0.5rem" }}>
          {SECTIONS.map((s) => (
            <div key={s.id}>
              <button type="button" onClick={() => toggle(s.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "0.7rem 0",
                  border: "none", borderBottom: "1px solid var(--setup-border)",
                  background: "transparent", color: "var(--setup-title)", cursor: "pointer",
                  fontSize: "0.95rem", fontWeight: 600, fontFamily: "var(--font-body)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                <span>{s.label}</span>
                <span style={{
                  transform: open === s.id ? "rotate(135deg)" : "rotate(0deg)",
                  transition: "transform 300ms ease", fontSize: "1rem", opacity: 0.5,
                }}>+</span>
              </button>
              <div style={{
                maxHeight: open === s.id ? "500px" : "0px", overflow: "hidden",
                transition: "max-height 400ms ease, opacity 300ms ease",
                opacity: open === s.id ? 1 : 0,
              }}>
                <div style={{
                  padding: "0.5rem 0 0.8rem", color: "var(--setup-subtitle)",
                  fontSize: "0.85rem", lineHeight: 1.65, whiteSpace: "pre-line",
                }}>
                  {s.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
