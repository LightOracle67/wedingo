export default function SupportTab() {
  return (
    <div className="support-section">
      <h3>Soporte</h3>
      <p>Si tienes cualquier problema o duda con la invitación, puedes contactar con el desarrollador:</p>
      <ul className="support-list">
        <li><strong>Email:</strong> <a href="mailto:adriancl2001@gmail.com">adriancl2001@gmail.com</a></li>
      </ul>

      <hr className="support-divider" />

      <h3>Wedingo</h3>
      <p>Aplicación web para la gestión de invitaciones de boda.</p>
      <p className="support-copyright">&copy; {new Date().getFullYear()} Adrián Carrasco López. Todos los derechos reservados.</p>
    </div>
  );
}
