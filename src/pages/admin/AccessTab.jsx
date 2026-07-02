import { memo } from "react";

const AccessTab = memo(function AccessTab({ setupToken, handleResetTokenFromAdmin, handleAdminLogout, confirmTokenInput, setConfirmTokenInput }) {
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

        <label className="setup-label" htmlFor="accessConfirmReset">
          Confirmar
        </label>
        <p className="setup-help setup-help--tight">
          Para generar un código nuevo, escribe el código de acceso actual.
        </p>
        <input
          id="accessConfirmReset"
          className="setup-input"
          value={confirmTokenInput}
          onChange={(e) => setConfirmTokenInput(e.target.value)}
          placeholder="Pega aquí el código actual"
          autoComplete="off"
          spellCheck="false"
        />

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
