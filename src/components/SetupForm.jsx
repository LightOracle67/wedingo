import { useApp } from "../contexts/AppContext";
import { MONTH_OPTIONS, THEME_GROUPS, THEME_OPTIONS, THEME_PREVIEW_COLORS } from "../lib/constants";

export default function SetupForm({ prefix = "" }) {
  const {
    formData, updateFormField, handleSaveSetup, handleDayChange,
    handleHourChange, handleMinuteChange, handleMinuteBlur, handleYearChange,
    handleCoordinateChange, handleBackgroundUpload, handleClearBackground,
    handleSelectPreviewBackground, previewBackgrounds,
    saveMessage, saveError, maxAllowedYear,
  } = useApp();

  const id = (name) => `${prefix}${name}`;

  return (
    <form className="setup-form setup-form--nested" onSubmit={handleSaveSetup}>
      <section className="setup-token-card" aria-label="Invitación">
          <p className="setup-help setup-help--tight">
          Modifica los datos que se muestran en la portada de la invitación.
        </p>

        <fieldset className="setup-name-group">
          <legend className="setup-label">Nombres</legend>
          <div className="setup-name-grid">
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("firstName")}>Primer contrayente</label>
              <input
                id={id("firstName")}
                className="setup-input"
                value={formData.firstName}
                onChange={(e) => updateFormField("firstName", e.target.value.slice(0, 20))}
                placeholder="Nombre"
                autoComplete="off"
              />
            </div>
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("secondName")}>Segundo contrayente</label>
              <input
                id={id("secondName")}
                className="setup-input"
                value={formData.secondName}
                onChange={(e) => updateFormField("secondName", e.target.value.slice(0, 20))}
                placeholder="Nombre"
                autoComplete="off"
              />
            </div>
          </div>
        </fieldset>

        <label className="setup-label" htmlFor={id("inviteMessage")}>
          Mensaje principal
        </label>
        <textarea
          id={id("inviteMessage")}
          className="setup-textarea"
          value={formData.inviteMessage}
          onChange={(e) => updateFormField("inviteMessage", e.target.value.slice(0, 220))}
          placeholder="Escribe el mensaje de la invitación"
        />

        <fieldset className="theme-picker">
          <legend className="setup-label">Tema visual</legend>
          {THEME_GROUPS.map((group) => (
            <div key={group.value}>
              <p className="theme-picker__group">{group.label}</p>
              <div className="theme-picker__grid">
                {THEME_OPTIONS.filter((t) => t.group === group.value).map((theme) => {
                  const colors = THEME_PREVIEW_COLORS[theme.value];
                  return (
                    <button
                      key={theme.value}
                      type="button"
                      className={`theme-picker__card ${formData.theme === theme.value ? "theme-picker__card--active" : ""}`}
                      onClick={() => updateFormField("theme", theme.value)}
                      aria-pressed={formData.theme === theme.value}
                    >
                      <span
                        className="theme-picker__swatch"
                        style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg} 50%, ${colors.accent} 100%)` }}
                      >
                        <span className="theme-picker__dot" style={{ background: colors.accent }} />
                      </span>
                      <span className="theme-picker__info">
                        <span className="theme-picker__name">{theme.label}</span>
                        <span className="theme-picker__hint">{theme.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>

        <label className="setup-label" htmlFor={id("weddingPlace")}>
          Lugar de la boda
        </label>
        <input
          id={id("weddingPlace")}
          className="setup-input"
          value={formData.weddingPlace}
          onChange={(e) => updateFormField("weddingPlace", e.target.value.slice(0, 120))}
          placeholder="Nombre o dirección del lugar de la celebración"
          autoComplete="off"
        />
        <p className="setup-help">
          Dirección del lugar. Si quieres más precisión, añade coordenadas.
        </p>

        <label className="setup-label">Coordenadas del mapa (opcional)</label>
        <div className="setup-date-grid">
          <div>
            <input
              id={id("weddingLatitude")}
              className="setup-input"
              value={formData.weddingLatitude}
              onChange={(e) => handleCoordinateChange("weddingLatitude", e.target.value)}
              placeholder="Latitud — Ejemplo: 40.4168"
              inputMode="decimal"
              autoComplete="off"
            />
          </div>
          <div>
            <input
              id={id("weddingLongitude")}
              className="setup-input"
              value={formData.weddingLongitude}
              onChange={(e) => handleCoordinateChange("weddingLongitude", e.target.value)}
              placeholder="Longitud — Ejemplo: -3.7038"
              inputMode="decimal"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="setup-background-panel">
          <div className="setup-background-panel__header">
            <div>
              <p className="setup-label setup-label--tight">Fondo de la portada</p>
              <p className="setup-help setup-help--tight">
                Sube una foto o elige un fondo para la portada.
              </p>
            </div>
            {formData.backgroundImage ? (
              <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearBackground}>
                Quitar el fondo
              </button>
            ) : null}
          </div>

          <label className="setup-upload" htmlFor={id("backgroundUpload")}>
                <span className="setup-upload__title">Subir foto</span>
            <span className="setup-upload__subtitle">Máximo 20 MB. Se comprimirá automáticamente.</span>
          </label>
          <input id={id("backgroundUpload")} className="setup-upload__input" type="file" accept="image/*" onChange={handleBackgroundUpload} />

          {formData.backgroundImage ? (
            <div className="setup-selected-background">
              <img src={formData.backgroundImage} alt="Fondo seleccionado" className="setup-selected-background__image" />
              <div>
                <p className="setup-selected-background__title">Fondo actual</p>
                <p className="setup-help setup-help--tight">{formData.backgroundImageLabel || "Imagen seleccionada"}</p>
              </div>
            </div>
          ) : null}

          {previewBackgrounds.length ? (
            <div className="setup-background-grid">
              {previewBackgrounds.map((bg) => (
                <button
                  key={bg.id}
                  className="setup-background-card"
                  type="button"
                  onClick={() => handleSelectPreviewBackground(bg.src, `${formData.weddingPlace} · ${bg.label}`)}
                >
                  <img src={bg.src} alt={bg.label} className="setup-background-card__image" />
                  <span className="setup-background-card__title">{bg.label}</span>
                  <span className="setup-background-card__description">{bg.description}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="setup-date-grid">
          <div>
            <label className="setup-label" htmlFor={id("weddingDay")}>Día</label>
            <input
              id={id("weddingDay")}
              className="setup-input"
              value={formData.weddingDay}
              onChange={(e) => handleDayChange(e.target.value)}
              placeholder="Ejemplo: 12"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingMonth")}>Mes</label>
            <select
              id={id("weddingMonth")}
              className="setup-input"
              value={formData.weddingMonth}
              onChange={(e) => updateFormField("weddingMonth", e.target.value)}
            >
              <option value="" disabled>Selecciona un mes</option>
              {MONTH_OPTIONS.map((mo) => (
                <option key={mo.value} value={mo.value}>{mo.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingYear")}>Año</label>
            <input
              id={id("weddingYear")}
              className="setup-input"
              value={formData.weddingYear}
              onChange={(e) => handleYearChange(e.target.value)}
              placeholder="Ejemplo: 2027"
              autoComplete="off"
            />
            <p className="setup-help">Máximo permitido: {maxAllowedYear}</p>
          </div>
        </div>

        <div className="setup-date-grid">
          <div>
            <label className="setup-label" htmlFor={id("weddingHour")}>Hora</label>
            <input
              id={id("weddingHour")}
              className="setup-input"
              value={formData.weddingHour}
              onChange={(e) => handleHourChange(e.target.value)}
              placeholder="Ejemplo: 14"
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="setup-help">De 0 a 23</p>
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingMinute")}>Minutos</label>
            <input
              id={id("weddingMinute")}
              className="setup-input"
              value={formData.weddingMinute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              onBlur={handleMinuteBlur}
              placeholder="Ejemplo: 30"
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="setup-help">De 00 a 59</p>
          </div>
        </div>

        <label className="setup-label" htmlFor={id("weddingSchedule")}>
          Horario de la boda
        </label>
        <textarea
          id={id("weddingSchedule")}
          className="setup-textarea"
          value={formData.weddingSchedule}
          onChange={(e) => updateFormField("weddingSchedule", e.target.value.slice(0, 2000))}
          placeholder="Ejemplo: 18:00 Recepción de invitados&#10;18:30 Ceremonia&#10;19:30 Cóctel&#10;21:00 Banquete&#10;23:00 Baile"
          rows={4}
        />
        <p className="setup-help">Escribe el horario, un salto de línea por cada evento.</p>

        <label className="setup-label" htmlFor={id("weddingDressCode")}>
          Código de vestimenta
        </label>
        <input
          id={id("weddingDressCode")}
          className="setup-input"
          value={formData.weddingDressCode}
          onChange={(e) => updateFormField("weddingDressCode", e.target.value.slice(0, 200))}
          placeholder="Ejemplo: Etiqueta informal"
          autoComplete="off"
        />
        <p className="setup-help">Sugerencia sobre cómo vestir para la celebración.</p>


        <div className="setup-actions">
          <button className="setup-button" type="submit">
            Guardar cambios
          </button>
        </div>
      </section>

      {saveMessage ? <p className="setup-success">{saveMessage}</p> : null}
      {saveError ? <p className="setup-error">{saveError}</p> : null}
    </form>
  );
}
