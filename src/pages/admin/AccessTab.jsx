import { memo } from "react";

const AccessTab = memo(function AccessTab({ setupToken, handleResetTokenFromAdmin, handleAdminLogout }) {
  return (
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
  );
});

export default AccessTab;
