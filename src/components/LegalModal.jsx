import { useEffect, useRef, useState } from "react";

export const PRIVACY_POLICY_VERSION = "2026-07-08";

const SECTIONS = [
  {
    id: "privacy",
    label: "Política de Privacidad",
    content: `Responsable del tratamiento: Adrián Carrasco López. Contacto: adriancl2001@gmail.com. Finalidad: gestión de invitaciones de boda, confirmación de asistencia y comunicación de eventos.

Base legal: consentimiento del interesado (art. 6.1.a GDPR). Los datos de salud (alergias e intolerancias alimentarias) se tratan con consentimiento explícito (art. 9.2.a GDPR) para adaptar el menú de la celebración.

Datos recogidos: nombre, preferencias alimentarias (alergias e intolerancias), imágenes subidas voluntariamente, datos bancarios si se proporcionan voluntariamente.

Destinatarios: Google LLC (Firebase, Google Cloud Platform) con sede en EE.UU. Google ha suscrito las Cláusulas Contractuales Tipo (SCC) aprobadas por la Comisión Europea (Decisión de Ejecución 2021/914) y dispone de un Data Processing Agreement (DPA) conforme al art. 28 GDPR. Además, Google cumple con el Data Privacy Framework (DPF) UE-EE.UU., Reino Unido-EE.UU. y Suiza-EE.UU., certificación que garantiza un nivel de protección adecuado para las transferencias internacionales de datos.

Transferencias internacionales: los datos se almacenan en servidores de Google Cloud en la región eur3 (Europa, Frankfurt). Cuando es necesario transferir datos a EE.UU., la transferencia se ampara en las SCC y en la certificación DPF de Google.

Plazo de conservación: los datos de los invitados se conservan hasta 12 meses después de la fecha del evento. Transcurrido ese plazo, se procederá a su eliminación automática. Los datos de configuración del creador se conservan mientras la cuenta esté activa.

Derechos: puedes ejercer tus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición escribiendo a adriancl2001@gmail.com. Los invitados pueden solicitar la eliminación de sus datos indicando su nombre y la invitación. Responderemos a tu solicitud en un plazo máximo de 30 días.

Derecho a retirar el consentimiento: puedes retirar tu consentimiento en cualquier momento. La retirada no afectará a la licitud del tratamiento basado en el consentimiento previo.

Menores de edad: no recogemos datos de menores de 14 años de forma consciente. Si el interesado es menor de 14 años (o la edad equivalente según el país de residencia: 13 en España, 16 en Alemania, etc.), se requiere el consentimiento de sus padres o tutores legales.

Decisiones automatizadas: no se toman decisiones automatizadas basadas en tus datos.

Consecuencias de no facilitar los datos: si no facilitas tus datos personales, no podremos gestionar tu confirmación de asistencia.

DPO: este sitio web no requiere Delegado de Protección de Datos según el art. 37 GDPR al no cumplirse los supuestos del art. 37.1. No obstante, puedes contactar con el responsable en cualquier momento.

Reclamaciones GDPR (UE/EEE): puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) o ante la autoridad de control de tu país miembro de la UE.

UK GDPR: para residentes en Reino Unido, el responsable del tratamiento se compromete a cumplir con el UK GDPR y la Data Protection Act 2018. Google cumple con el UK Extension al DPF UE-EE.UU., y las SCC han sido adoptadas por la Information Commissioner's Office (ICO) como mecanismo de transferencia válido. Puedes presentar una reclamación ante la ICO (https://ico.org.uk).

LGPD (Brasil): para residentes en Brasil, el responsable del tratamiento se compromete a cumplir con la Lei Geral de Proteção de Dados Pessoais (LGPD – Lei nº 13.709/2018). Google cumple con los requisitos de transferencia internacional de la LGPD. Puedes ejercer tus derechos y presentar una reclamación ante la ANPD (Autoridade Nacional de Proteção de Dados).

CCPA/CPRA (California): para residentes en California (EE.UU.), tienes derecho a:
- Saber qué categorías de datos personales recogemos y para qué fin.
- Solicitar la eliminación de tus datos personales.
- Optar por no vender tus datos personales (no vendemos datos personales).
- No ser discriminado por ejercer tus derechos CCPA.
Para ejercer estos derechos, escribe a adriancl2001@gmail.com.

PIPEDA (Canadá): para residentes en Canadá, cumplimos con la Personal Information Protection and Electronic Documents Act. Recogemos datos con tu consentimiento para fines limitados y razonables. Puedes solicitar acceso, corrección o eliminación de tus datos. Si no estás satisfecho, puedes presentar una queja ante la Office of the Privacy Commissioner of Canada (OPC).

POPIA (Sudáfrica): para residentes en Sudáfrica, cumplimos con la Protection of Personal Information Act (POPIA). Recogemos tus datos con tu consentimiento para fines específicos. No transferimos tus datos fuera de Sudáfrica sin garantías adecuadas. Puedes presentar una reclamación ante la Information Regulator (South Africa).

Almacenamiento local: este sitio utiliza almacenamiento local (localStorage y sessionStorage) únicamente para funciones esenciales: mantener tu sesión iniciada y cachear la configuración de la invitación. No utilizamos cookies de terceros ni rastreadores. Al continuar navegando, consientes el uso de este almacenamiento técnico necesario.`,
  },
  {
    id: "terms",
    label: "Términos de Uso",
    content: `El uso de Wedingo implica la aceptación de estos términos. Wedingo es una plataforma para crear y gestionar invitaciones de boda.

El usuario se compromete a no utilizar la plataforma para fines ilícitos ni para enviar contenido ofensivo.

Wedingo no se hace responsable del contenido generado por los usuarios ni del uso que los invitados hagan de sus datos personales.

Nos reservamos el derecho de modificar estos términos. Los cambios serán notificados a través de la plataforma.

Para residentes en California: en caso de conflicto entre estos términos y la CCPA, prevalecerán los derechos otorgados por la CCPA.`,
  },
  {
    id: "legal",
    label: "Aviso Legal",
    content: `En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa:

Responsable: Adrián Carrasco López
Email: adriancl2001@gmail.com
Finalidad del sitio web: plataforma de invitaciones de boda personalizadas.

Este sitio web utiliza Firebase (Google LLC) como infraestructura de hosting y almacenamiento, con servidores en la Unión Europea.`,
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
        style={{ maxWidth: "520px", maxHeight: "calc(100dvh - 2rem)", display: "flex", flexDirection: "column" }}>
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
                maxHeight: open === s.id ? "800px" : "0px", overflow: "hidden",
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
