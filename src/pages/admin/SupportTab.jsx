export default function SupportTab() {
  const handleDeleteMail = () => {
    const subject = encodeURIComponent("Solicitud de eliminación de datos - Wedingo");
    const body = encodeURIComponent(
      "Hola,\n\n" +
      "Solicito la eliminación de mis datos personales asociados a la siguiente invitación:\n\n" +
      "Nombre del invitado:\nToken de invitación (si lo conoces):\n\n" +
      "Ejercicio del derecho de supresión (GDPR Art. 17 / CCPA / LGPD / POPIA).\n\n" +
      "Gracias."
    );
    window.open(`mailto:adriancl2001@gmail.com?subject=${subject}&body=${body}`, "_blank");
  };

  const handleExportMail = () => {
    const subject = encodeURIComponent("Solicitud de exportación de datos - Wedingo");
    const body = encodeURIComponent(
      "Hola,\n\n" +
      "Solicito la exportación de mis datos personales asociados a la siguiente invitación:\n\n" +
      "Nombre del invitado:\nToken de invitación (si lo conoces):\n\n" +
      "Ejercicio del derecho de portabilidad (GDPR Art. 20).\n\n" +
      "Gracias."
    );
    window.open(`mailto:adriancl2001@gmail.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="support-section">
      <h3>Soporte</h3>
      <p>Si tienes cualquier problema o duda con la invitación, puedes contactar con el desarrollador:</p>
      <ul className="support-list">
        <li><strong>Email:</strong> <a href="mailto:adriancl2001@gmail.com">adriancl2001@gmail.com</a></li>
      </ul>

      <hr className="support-divider" />

      <h3>Tus derechos</h3>
      <p>Puedes solicitar la eliminación o exportación de tus datos personales en cualquier momento según tu jurisdicción (GDPR, UK GDPR, CCPA, LGPD, PIPEDA o POPIA).</p>
      <div className="legal-actions">
        <button className="setup-button" onClick={handleDeleteMail}>Solicitar borrado de datos</button>
        <button className="setup-button" onClick={handleExportMail}>Exportar mis datos</button>
      </div>
      <p style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "var(--setup-subtitle)" }}>
        Se abrirá tu cliente de correo con una plantilla predefinida. También puedes escribir a <a href="mailto:adriancl2001@gmail.com" style={{ color: "var(--setup-accent)" }}>adriancl2001@gmail.com</a>.
      </p>

      <hr className="support-divider" />

      <h3>CCPA / CPRA (California)</h3>
      <p>Wedingo no vende datos personales. Los datos recogidos se usan exclusivamente para la gestión de la invitación. Si eres residente en California, tienes derecho a solicitar la eliminación de tus datos y a no ser discriminado por ejercer tus derechos.</p>

      <hr className="support-divider" />

      <h3>Wedingo</h3>
      <p>Aplicación web para la gestión de invitaciones de boda.</p>
      <p className="support-copyright">&copy; {new Date().getFullYear()} Adrián Carrasco López. Todos los derechos reservados.</p>
    </div>
  );
}
