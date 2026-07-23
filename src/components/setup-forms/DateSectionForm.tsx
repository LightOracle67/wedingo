import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";
import { MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER } from "../../lib/constants";

export default function DateSectionForm({ prefix = "" }) {
  const {
    formData, updateFormField,
    handleDayChange, handleYearChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    maxAllowedYear, previewBackgrounds,
  } = useApp();
  const { t } = useTranslation();

  const id = (name: any) => `${prefix}${name}`;

  const handlePlaceChange = useCallback((e: any) => {
    const val = e.target.value.slice(0, 120);
    updateFormField("weddingPlace", val);
    updateFormField("weddingLatitude", "");
    updateFormField("weddingLongitude", "");
    if (val.length >= 3) {
      const searchEl = document.getElementById("weddingPlaceResults");
      if (searchEl) searchEl.textContent = t("setup.searching");
      import("../../lib/geo-utils").then(({ searchLocations }) => {
        searchLocations(val).then(results => {
          const el = document.getElementById("weddingPlaceResults");
          if (!el) return;
          el.textContent = "";
          if (!results.length) {
            el.textContent = t("setup.noResults");
            return;
          }
          results.forEach(r => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "setup-search-result";
            btn.dataset.lat = r.latitude;
            btn.dataset.lon = r.longitude;
            btn.dataset.label = r.label;
            btn.textContent = r.label;
            btn.onclick = () => {
              updateFormField("weddingPlace", r.label.slice(0, 120));
              updateFormField("weddingLatitude", r.latitude);
              updateFormField("weddingLongitude", r.longitude);
              el.textContent = "";
            };
            el.appendChild(btn);
          });
        });
      });
    } else {
      const el = document.getElementById("weddingPlaceResults");
      if (el) el.textContent = "";
    }
  }, [updateFormField, t]);

  return (
    <>
      <label className="setup-label" htmlFor={id("weddingPlace")}>
        {t("setup.placeLabel")}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id("weddingPlace")}
          className="setup-input"
          value={formData.weddingPlace}
          onChange={handlePlaceChange}
          onBlur={() => setTimeout(() => {
            const el = document.getElementById("weddingPlaceResults");
            if (el) el.textContent = "";
          }, 200)}
          placeholder={t("setup.placePlaceholder")}
          autoComplete="street-address"
        />
        <div id="weddingPlaceResults" style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
          background: "color-mix(in srgb, var(--setup-grad-start) 96%, transparent)",
          border: "1px solid var(--setup-border)", borderRadius: "0 0 0.7rem 0.7rem",
          maxHeight: "200px", overflowY: "auto",
        }} />
      </div>
      <p className="setup-help">{t("setup.placeHint")}</p>

      {(() => {
        if (!previewBackgrounds.length) return null;
        const locationPreview = previewBackgrounds.find((bg: any) => bg.id === "default");
        if (!locationPreview) return null;
        return (
          <div className="setup-location-preview">
            <p className="setup-label setup-label--tight">{t("setup.mapPreview")}</p>
            <img src={locationPreview.src} alt={t("setup.mapPreviewAlt")} className="setup-location-preview__image" />
          </div>
        );
      })()}

      <div className="setup-date-grid">
        <div>
          <label className="setup-label" htmlFor={id("weddingDay")}>{t("setup.dayLabel")}</label>
          <input
            id={id("weddingDay")}
            className="setup-input"
            value={formData.weddingDay}
            onChange={(e) => handleDayChange(e.target.value)}
            placeholder={t("setup.dayPlaceholder")}
            inputMode="numeric"
            autoComplete="off"
            min="1" max="31"
          />
        </div>
        <div>
          <label className="setup-label" htmlFor={id("weddingMonth")}>{t("setup.monthLabel")}</label>
          <select
            id={id("weddingMonth")}
            className="setup-input"
            value={formData.weddingMonth}
            onChange={(e) => updateFormField("weddingMonth", e.target.value)}
          >
            <option value="" disabled>{t("setup.monthPlaceholder")}</option>
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>{t("monthNames." + ((MONTH_VALUE_TO_NUMBER as any)[month.value] || ""))}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="setup-label" htmlFor={id("weddingYear")}>{t("setup.yearLabel")}</label>
          <input
            id={id("weddingYear")}
            className="setup-input"
            value={formData.weddingYear}
            onChange={(e) => handleYearChange(e.target.value)}
            placeholder={t("setup.yearPlaceholder")}
            inputMode="numeric"
            autoComplete="off"
          />
          <p className="setup-help">{t("setup.yearMaxHint", { year: maxAllowedYear })}</p>
        </div>
      </div>

      <div className="setup-date-grid">
        <div>
          <label className="setup-label" htmlFor={id("weddingHour")}>{t("setup.hourLabel")}</label>
          <input
            id={id("weddingHour")}
            className="setup-input"
            value={formData.weddingHour}
            onChange={(e) => handleHourChange(e.target.value)}
            placeholder={t("setup.hourPlaceholder")}
            inputMode="numeric"
            autoComplete="off"
            min="0" max="23"
          />
          <p className="setup-help">{t("setup.hourHint")}</p>
        </div>
        <div>
          <label className="setup-label" htmlFor={id("weddingMinute")}>{t("setup.minuteLabel")}</label>
          <input
            id={id("weddingMinute")}
            className="setup-input"
            value={formData.weddingMinute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            onBlur={handleMinuteBlur}
            placeholder={t("setup.minutePlaceholder")}
            inputMode="numeric"
            autoComplete="off"
            min="0" max="59"
          />
          <p className="setup-help">{t("setup.minuteHint")}</p>
        </div>
      </div>

      <label className="setup-label" htmlFor={id("weddingSchedule")}>
        {t("setup.scheduleLabel")}
      </label>
      <textarea
        id={id("weddingSchedule")}
        className="setup-textarea"
        value={formData.weddingSchedule}
        onChange={(e) => updateFormField("weddingSchedule", e.target.value.slice(0, 2000))}
        placeholder={t("setup.schedulePlaceholder")}
        rows={4}
        maxLength={2000}
        autoComplete="off"
      />
      <p className="setup-help">{t("setup.scheduleHint")}</p>

      <label className="setup-label">{t("setup.dressCodeLabel")}</label>
      <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
        {[
          { value: "Traje de gala", key: "setup.dressCodeGala" },
          { value: "Etiqueta informal", key: "setup.dressCodeCasual" },
          { value: "Vestimenta formal", key: "setup.dressCodeFormal" },
          { value: "Cóctel elegante", key: "setup.dressCodeCocktail" },
          { value: "Ropa cómoda", key: "setup.dressCodeComfortable" },
        ].map(({ value, key }) => (
          <label key={value} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
            <input type="checkbox" checked={formData.weddingDressCode === value} onChange={() => updateFormField("weddingDressCode", formData.weddingDressCode === value ? "" : value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
            {t(key)}
          </label>
        ))}
      </div>
      <p className="setup-help">{t("setup.dressCodeHint")}</p>

      <label className="setup-label" htmlFor={id("accommodationInfo")}>
        {t("setup.accommodationLabel")}
      </label>
      <textarea
        id={id("accommodationInfo")}
        className="setup-textarea"
        value={formData.accommodationInfo}
        onChange={(e) => updateFormField("accommodationInfo", e.target.value.slice(0, 2000))}
        placeholder={t("setup.accommodationPlaceholder")}
        rows={4}
        maxLength={2000}
        autoComplete="off"
      />
      <p className="setup-help">{t("setup.accommodationHint")}</p>

      <label className="setup-label" htmlFor={id("transportInfo")}>
        {t("setup.transportLabel")}
      </label>
      <textarea
        id={id("transportInfo")}
        className="setup-textarea"
        value={formData.transportInfo}
        onChange={(e) => updateFormField("transportInfo", e.target.value.slice(0, 2000))}
        placeholder={t("setup.transportPlaceholder")}
        rows={4}
        maxLength={2000}
        autoComplete="off"
      />
      <p className="setup-help">{t("setup.transportHint")}</p>
    </>
  );
}
