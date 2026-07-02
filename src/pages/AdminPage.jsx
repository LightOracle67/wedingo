import { useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import SetupForm from "../components/SetupForm";

const TABS = [
  { key: "panel", label: "Panel" },
  { key: "invitacion", label: "Invitación" },
  { key: "asistencia", label: "Asistencia" },
  { key: "acceso", label: "Acceso" },
];

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StatsCard({ label, value, accent }) {
  return (
    <div className="admin-stats-card">
      <span className="admin-stats-card__value">{value}</span>
      <span className="admin-stats-card__label">{label}</span>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    hasStoredConfig, isConfigLoading, configLoadError,
    isAdminTokenLoggedIn, config,
    adminLoginUsername, setAdminLoginUsername,
    setupToken, setupTokenInput, setSetupTokenInput,
    generatedToken,
    isTokenVerifying,
    authMessage, authMessageType,
    rsvpEntries,
    adminMessage,
    handleGenerateToken, handleAdminTokenLogin,
    handleAdminLogout, handleResetTokenFromAdmin,
    handleClearRsvpEntries,
  } = useApp();

  const [activeTab, setActiveTab] = useState("panel");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  const filteredEntries = useMemo(() => {
    let result = rsvpEntries;
    if (attendanceFilter === "yes") result = result.filter((e) => e.attendance === "yes");
    if (attendanceFilter === "no") result = result.filter((e) => e.attendance === "no");
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e) => e.guestName.toLowerCase().includes(q));
    }
    return result;
  }, [rsvpEntries, attendanceFilter, searchQuery]);

  if (isConfigLoading) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Cargando configuración">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Configuración</p>
              <h1 className="setup-title">Cargando invitación</h1>
              <p className="setup-subtitle">Estamos recuperando la configuración guardada.</p>
            </div>
          </header>
        </section>
      </div>
    );
  }

  if (configLoadError) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Error de carga">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Error de conexión</p>
              <h1 className="setup-title">No pudimos cargar la invitación</h1>
              <p className="setup-subtitle">{configLoadError}</p>
            </div>
          </header>
          <div className="setup-actions">
            <button className="setup-button" type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!hasStoredConfig) {
    return <Navigate to="/setup" replace />;
  }

  // ---- LOGIN FORM ----
  if (!isAdminTokenLoggedIn) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Acceso administrativo">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Área privada</p>
              <h1 className="setup-title">Acceso de administrador</h1>
              <p className="setup-subtitle">
                Introduce tu usuario y genera un código de acceso de un solo uso.
              </p>
            </div>
          </header>

          <form className="setup-form" onSubmit={(e) => { e.preventDefault(); handleAdminTokenLogin(); }}>
            <div className="setup-token-card">
              <label className="setup-label" htmlFor="adminLoginUsername">Usuario</label>
              <input
                id="adminLoginUsername"
                className="setup-input"
                value={adminLoginUsername}
                onChange={(e) => setAdminLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50))}
                placeholder="Escribe tu nombre de usuario"
                autoComplete="username"
                name="username"
              />
              <div className="setup-actions" style={{ marginTop: "1rem" }}>
                <button className="setup-button" type="button" onClick={handleGenerateToken}>
                  Generar código de acceso
                </button>
              </div>
              {generatedToken ? (
                <div className="setup-token-card" style={{ marginTop: "1rem" }}>
                  <p className="setup-label setup-label--tight">Código generado (único uso)</p>
                  <p className="setup-help setup-help--tight">
                    Cópialo o haz clic en "Entrar" para usarlo ahora.
                  </p>
                  <label className="setup-label" htmlFor="adminGeneratedToken" style={{ textAlign: "center", display: "block" }}>Código generado</label>
                  <p
                    id="adminGeneratedToken"
                    className="setup-token-display"
                    role="textbox"
                    aria-readonly="true"
                    tabIndex={0}
                    style={{ fontSize: "1.2em", letterSpacing: "0.15em", textAlign: "center" }}
                  >
                    {generatedToken}
                  </p>
                  <label className="setup-label" htmlFor="adminTokenInput" style={{ marginTop: "1rem", display: "block" }}>Introduce el código de acceso</label>
                  <input
                    id="adminTokenInput"
                    className="setup-input setup-token-input"
                    type="password"
                    value={setupTokenInput}
                    onChange={(e) => setSetupTokenInput(e.target.value.toUpperCase())}
                    placeholder="Pega aquí el código de acceso"
                    maxLength={19}
                    autoComplete="current-password"
                    spellCheck="false"
                  />
                  <button className="setup-button" type="submit" disabled={isTokenVerifying}>
                    {isTokenVerifying ? "Comprobando..." : "Entrar"}
                  </button>
                </div>
              ) : null}
            </div>
            {authMessage ? <p className={authMessageType === "success" ? "setup-success" : "setup-error"}>{authMessage}</p> : null}
            <div className="setup-actions">
              <button className="setup-button setup-button--ghost" type="button" onClick={() => navigate("/")}>
                Volver a la portada
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  // ---- ADMIN LOGGED IN ----
  const confirmedResponses = rsvpEntries.filter((e) => e.attendance === "yes").length;
  const declinedResponses = rsvpEntries.filter((e) => e.attendance === "no").length;
  const totalGuests = rsvpEntries.reduce(
    (sum, e) => sum + (e.attendance === "yes" ? 1 + e.companions : 0), 0,
  );

  const exportCsv = () => {
    const header = "Nombre,Asistencia,Acompañantes,Nota,Fecha";
    const rows = rsvpEntries.map((e) =>
      [
        `"${e.guestName}"`,
        e.attendance === "yes" ? "Sí" : "No",
        e.attendance === "yes" ? e.companions : 0,
        `"${(e.note || "").replace(/"/g, '""')}"`,
        formatDate(e.submittedAt),
      ].join(","),
    );
    const blob = new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invitados_${config.firstName}_${config.secondName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const coupleName = `${config.firstName} & ${config.secondName}`;

  return (
    <div className="setup-layout">
      <section className="setup-card allow-select" aria-label="Panel de administración">
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">Área privada</p>
            <h1 className="setup-title">{coupleName}</h1>
              <p className="setup-subtitle">Gestiona tu invitación de boda</p>
          </div>
        </header>

        <nav className="admin-tabs" role="tablist" aria-label="Secciones">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`admin-tab ${activeTab === tab.key ? "admin-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="setup-form">
          {/* ---- TAB: PANEL ---- */}
          {activeTab === "panel" && (
            <>
              <div className="admin-stats-grid">
                <StatsCard label="Confirmados" value={confirmedResponses} accent="yes" />
                <StatsCard label="No asistirán" value={declinedResponses} accent="no" />
                <StatsCard label="Sin responder" value={Math.max(0, rsvpEntries.length - confirmedResponses - declinedResponses)} accent="pending" />
                <StatsCard label="Total invitados" value={totalGuests} accent="total" />
              </div>

              <div className="admin-panel-actions">
                <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => { setActiveTab("asistencia"); setAttendanceFilter("all"); }}>
                  Ver lista completa
                </button>
                <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportCsv}>
                  Exportar CSV
                </button>
                <a className="setup-button setup-button--ghost setup-button--compact" href={window.location.origin} target="_blank" rel="noreferrer">
                  Ver portada
                </a>
              </div>

              {rsvpEntries.length > 0 ? (
                <div className="admin-recent-section">
                  <p className="setup-label setup-label--tight">Últimas respuestas</p>
                  {rsvpEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="admin-recent-row">
                      <span className="admin-recent-row__name">{entry.guestName}</span>
                      <span className={`admin-recent-row__status admin-recent-row__status--${entry.attendance}`}>
                        {entry.attendance === "yes" ? `Sí (${entry.companions} acompañante${entry.companions === 1 ? "" : "s"})` : "No asistirá"}
                      </span>
                      <span className="admin-recent-row__date">{formatDate(entry.submittedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="setup-help">Todavía no hay respuestas de asistencia.</p>
              )}
            </>
          )}

          {/* ---- TAB: INVITACIÓN ---- */}
          {activeTab === "invitacion" && <SetupForm prefix="admin" />}

          {/* ---- TAB: ASISTENCIA ---- */}
          {activeTab === "asistencia" && (
            <>
              <div className="admin-filters">
                <label className="sr-only" htmlFor="adminSearchName">Buscar por nombre</label>
                <input
                  id="adminSearchName"
                  className="setup-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre..."
                  autoComplete="off"
                />
                <div className="admin-filter-buttons">
                  {["all", "yes", "no"].map((f) => (
                    <button
                      key={f}
                      className={`setup-button setup-button--compact ${attendanceFilter === f ? "" : "setup-button--ghost"}`}
                      type="button"
                      onClick={() => setAttendanceFilter(f)}
                    >
                      {f === "all" ? "Todos" : f === "yes" ? "Confirmados" : "No asisten"}
                    </button>
                  ))}
                </div>
                <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportCsv}>
                  Exportar CSV
                </button>
              </div>

              {filteredEntries.length > 0 ? (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Asistencia</th>
                        <th>Acompañantes</th>
                        <th>Nota</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="admin-table__name">{entry.guestName}</td>
                          <td>
                            <span className={`admin-badge admin-badge--${entry.attendance}`}>
                              {entry.attendance === "yes" ? "Sí" : "No"}
                            </span>
                          </td>
                          <td>{entry.attendance === "yes" ? entry.companions : "—"}</td>
                          <td className="admin-table__note">{entry.note || "—"}</td>
                          <td className="admin-table__date">{formatDate(entry.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="setup-help">
                  {searchQuery || attendanceFilter !== "all"
                    ? "No se encontraron resultados con ese filtro."
                    : "Todavía no hay respuestas de asistencia."}
                </p>
              )}

              {rsvpEntries.length > 0 && (
                <div className="setup-actions">
                  <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearRsvpEntries}>
                    Vaciar asistencia
                  </button>
                </div>
              )}
            </>
          )}

          {/* ---- TAB: ACCESO ---- */}
          {activeTab === "acceso" && (
            <>
              <div className="setup-token-card">
                <p className="setup-help setup-help--tight">
                  Usa esta sección para generar un código nuevo. El código anterior dejará de servir.
                </p>
                <input
                  className="setup-input setup-token-input"
                  value={setupToken || ""}
                  readOnly
                  autoComplete="off"
                  spellCheck="false"
                  placeholder="Pulsa «Generar» para crear un código nuevo"
                />
                {setupToken ? <p className="setup-token-display">Código activo (solo tú lo ves).</p> : null}
                <div className="setup-actions">
                  <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleResetTokenFromAdmin}>
                    Generar código nuevo
                  </button>
                  <button className="setup-button" type="button" onClick={handleAdminLogout}>
                    Cerrar sesión
                  </button>
                </div>
              </div>

              <div className="setup-actions">
                <a className="setup-button setup-button--ghost" href={window.location.origin} target="_blank" rel="noreferrer">
                  Volver a la portada
                </a>
              </div>
            </>
          )}

          {adminMessage ? <p className="setup-success">{adminMessage}</p> : null}
        </div>
      </section>
    </div>
  );
}
