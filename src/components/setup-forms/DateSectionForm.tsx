import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";
import { MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER } from "../../lib/constants";
import { isValidGoogleMapsUrl, convertToEmbedUrl } from "../../lib/geo-utils";

export default function DateSectionForm({ prefix = "" }) {
  const { formData, updateFormField, handleDayChange, handleYearChange, handleHourChange, handleMinuteChange, handleMinuteBlur, maxAllowedYear } = useApp();
  const { t } = useTranslation();
  const id = (name: string) => `${prefix}${name}`;

  const handleMapUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField("weddingMapUrl", e.target.value);
  }, [updateFormField]);

  const embedUrl = useMemo(() => {
    if (!formData.weddingMapUrl?.trim()) return "";
    const url = formData.weddingMapUrl.trim();
    if (!isValidGoogleMapsUrl(url)) return "";
    return convertToEmbedUrl(url);
  }, [formData.weddingMapUrl]);

  return (
    <>
      <label className="setup-label" htmlFor={id("weddingMapUrl")}>
        {t("setup.mapUrlLabel")}
        {formData.weddingMapUrl?.trim() && !isValidGoogleMapsUrl(formData.weddingMapUrl?.trim() || "") ? (
          <span style={{ color: "#ef4444", fontSize: "0.8rem", marginLeft: "0.5rem" }}>{t("setup.mapUrlInvalid")}</span>
        ) : null}
      </label>
      <input
        id={id("weddingMapUrl")}
        className="setup-input"
        value={formData.weddingMapUrl || ""}
        onChange={handleMapUrlChange}
        placeholder={t("setup.mapUrlPlaceholder")}
        autoComplete="off"
      />
      <p className="setup-help">{t("setup.mapUrlHint")}</p>

      {embedUrl ? (
        <div style={{ marginTop: "0.75rem" }}>
          <p className="setup-label setup-label--tight">{t("setup.mapPreview")}</p>
          <iframe
            title="Google Maps preview"
            src={embedUrl}
            width="100%"
            height="250"
            style={{ border: 0, borderRadius: "var(--radius-xl)", marginTop: "0.35rem" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}

      <div className="story-divider" />

      <label className="setup-label" htmlFor={id("weddingPlace")}>
        {t("setup.placeLabel")}
      </label>
      <input
        id={id("weddingPlace")}
        className="setup-input"
        value={formData.weddingPlace}
        onChange={(e) => updateFormField("weddingPlace", e.target.value.slice(0, 120))}
        placeholder={t("setup.placePlaceholder")}
        autoComplete="street-address"
      />
      <p className="setup-help">{t("setup.placeHint")}</p>

      <div className="setup-date-grid">
        <div>
          <label className="setup-label" htmlFor={id("weddingDay")}>{t("setup.dayLabel")}</label>
          <input
            id={id("weddingDay")}
            className="setup-input"
            value={formData.weddingDay}
            onChange={(e) => handleDayChange(e.target.value)}
            placeholder={t("setup.dayPlaceholder")}
            inputMode="numeric" autoComplete="off" min="1" max="31"
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
              <option key={month.value} value={month.value}>{t("monthNames." + (MONTH_VALUE_TO_NUMBER[month.value] || ""))}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="setup-label" htmlFor={id("weddingYear")}>{t("setup.yearLabel")}</label>
          <input
            id={id("weddingYear")} className="setup-input" value={formData.weddingYear}
            onChange={(e) => handleYearChange(e.target.value)}
            placeholder={t("setup.yearPlaceholder")} inputMode="numeric" autoComplete="off"
          />
          <p className="setup-help">{t("setup.yearMaxHint", { year: maxAllowedYear })}</p>
        </div>
      </div>

      <div className="setup-date-grid">
        <div>
          <label className="setup-label" htmlFor={id("weddingHour")}>{t("setup.hourLabel")}</label>
          <input
            id={id("weddingHour")} className="setup-input" value={formData.weddingHour}
            onChange={(e) => handleHourChange(e.target.value)}
            placeholder={t("setup.hourPlaceholder")} inputMode="numeric" autoComplete="off" min="0" max="23"
          />
        </div>
        <div>
          <label className="setup-label" htmlFor={id("weddingMinute")}>{t("setup.minuteLabel")}</label>
          <input
            id={id("weddingMinute")} className="setup-input" value={formData.weddingMinute}
            onChange={(e) => handleMinuteChange(e.target.value)} onBlur={handleMinuteBlur}
            placeholder={t("setup.minutePlaceholder")} inputMode="numeric" autoComplete="off" min="0" max="59"
          />
        </div>
      </div>

      <label className="setup-label" htmlFor={id("weddingSchedule")}>{t("setup.scheduleLabel")}</label>
      <textarea
        id={id("weddingSchedule")} className="setup-textarea" value={formData.weddingSchedule}
        onChange={(e) => updateFormField("weddingSchedule", e.target.value.slice(0, 2000))}
        placeholder={t("setup.schedulePlaceholder")} rows={4} maxLength={2000} autoComplete="off"
      />
    </>
  );
}
