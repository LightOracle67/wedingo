export default function ComplianceTab() {
  return (
    <div className="support-section">
      <h3>Registro de actividades de tratamiento (Art. 30 GDPR)</h3>
      <p style={{ fontSize: "0.8rem", color: "var(--setup-subtitle)", marginBottom: "1rem" }}>
        Actualizado: julio 2026. Este registro documenta las actividades de tratamiento de datos personales en Wedingo.
      </p>

      <table className="admin-table" style={{ fontSize: "0.8rem" }}>
        <thead>
          <tr>
            <th>Actividad</th>
            <th>Datos tratados</th>
            <th>Base legal</th>
            <th>Finalidad</th>
            <th>Plazo conservación</th>
            <th>Destinatarios</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gestión de invitaciones</td>
            <td>Nombre de novios, fecha, lugar, tema, fotos, música, menú, secciones</td>
            <td>Consentimiento (Art. 6.1.a GDPR)</td>
            <td>Crear y personalizar invitación de boda</td>
            <td>Mientras la cuenta esté activa</td>
            <td>Google Cloud (Firestore, hosting)</td>
          </tr>
          <tr>
            <td>Confirmación de asistencia (RSVP)</td>
            <td>Nombre del invitado, asistencia (sí/no), selección de menú, alergias, datos de salud</td>
            <td>Consentimiento (Art. 6.1.a, 9.2.a GDPR)</td>
            <td>Gestionar lista de invitados y menú</td>
            <td>12 meses tras el evento</td>
            <td>Google Cloud (Firestore)</td>
          </tr>
          <tr>
            <td>Subida de imágenes</td>
            <td>Fotos de boda (cifradas AES-256-GCM)</td>
            <td>Consentimiento (Art. 6.1.a GDPR)</td>
            <td>Galería de fotos en la invitación</td>
            <td>12 meses tras el evento</td>
            <td>Google Cloud (Firestore subcollection)</td>
          </tr>
          <tr>
            <td>Autenticación y sesiones</td>
            <td>Token de sesión, nombre de usuario admin</td>
            <td>Interés legítimo (Art. 6.1.f GDPR)</td>
            <td>Controlar acceso al panel de administración</td>
            <td>Duración de la sesión</td>
            <td>Google Cloud (Firestore sessions)</td>
          </tr>
          <tr>
            <td>Auditoría de superadmin</td>
            <td>Acciones de superadmin, tokens usados, invitaciones eliminadas</td>
            <td>Obligación legal (Art. 6.1.c GDPR)</td>
            <td>Registro de actividades administrativas</td>
            <td>3 años</td>
            <td>Google Cloud (Firestore auditLog)</td>
          </tr>
        </tbody>
      </table>

      <hr className="support-divider" />

      <h3>Transferencias internacionales</h3>
      <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--setup-subtitle)" }}>
        Los datos se almacenan en servidores de Google Cloud en la región eur3 (Frankfurt, Alemania).
        Google LLC (EE.UU.) actúa como encargado del tratamiento bajo DPA conforme al Art. 28 GDPR.
        Las transferencias a EE.UU. se amparan en:
      </p>
      <ul className="support-list" style={{ fontSize: "0.85rem", color: "var(--setup-subtitle)" }}>
        <li>Cláusulas Contractuales Tipo (SCC) - Decisión de Ejecución 2021/914</li>
        <li>Data Privacy Framework (DPF) UE-EE.UU., UK-EE.UU. y Suiza-EE.UU.</li>
      </ul>

      <hr className="support-divider" />

      <h3>Medidas técnicas y organizativas</h3>
      <ul className="support-list" style={{ fontSize: "0.85rem", color: "var(--setup-subtitle)" }}>
        <li>Cifrado AES-256-GCM de imágenes y datos sensibles (PBKDF2)</li>
        <li>Conexión HTTPS (TLS 1.3) en toda la plataforma</li>
        <li>Reglas de seguridad en Firestore (control de acceso basado en sesiones)</li>
        <li>Almacenamiento local mínimo y solo con consentimiento</li>
        <li>Política de retención: 12 meses post-evento para datos de invitados</li>
        <li>Superadmin protegido por Firebase Authentication + ruta oculta</li>
      </ul>
    </div>
  );
}
