import { useCallback, useMemo } from "react";
import CharacterCounter from "../../components/CharacterCounter";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";
import { MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER } from "../../lib/constants";
import { isValidGoogleMapsUrl, convertToEmbedUrl, extractPlaceNameFromUrl } from "../../lib/geo-utils";

export default function DateSectionForm({ prefix = "" }) {
  const { formData, updateFormField, handleDayChange, handleYearChange, handleHourChange, handleMinuteChange, handleMinuteBlur, maxAllowedYear } = useApp();
  const { t } = useTranslation();
  const id = (name: string) => `${prefix}${name}`;

  const handleSiteUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField("weddingSiteURL", e.target.value);
  }, [updateFormField]);

  const siteUrl = formData.weddingSiteURL?.trim() || "";
  const isSiteUrlValid = siteUrl ? isValidGoogleMapsUrl(siteUrl) : false;

  const embedUrl = useMemo(() => {
    if (!isSiteUrlValid) return "";
    return convertToEmbedUrl(siteUrl, formData.weddingMapView || "roadmap");
  }, [siteUrl, isSiteUrlValid, formData.weddingMapView]);

  const siteName = useMemo(() => {
    if (!isSiteUrlValid) return "";
    return extractPlaceNameFromUrl(siteUrl) || "";
  }, [siteUrl, isSiteUrlValid]);

  const dayError = (() => {
    const d = (formData.weddingDay || "").trim();
    if (!d) return false;
    return !/^(0?[1-9]|[12][0-9]|3[01])$/.test(d);
  })();
  const yearError = (() => {
    const y = (formData.weddingYear || "").trim();
    if (!y) return false;
    const n = Number.parseInt(y, 10);
    return !Number.isFinite(n) || y.length !== 4 || n < new Date().getFullYear() - 120 || n > maxAllowedYear;
  })();
  const hourError = (() => {
    const h = (formData.weddingHour || "").trim();
    if (!h) return false;
    return !/^([01]?[0-9]|2[0-3])$/.test(h);
  })();
  const minuteError = (() => {
    const m = (formData.weddingMinute || "").trim();
    if (!m) return false;
    return !/^[0-5]?[0-9]$/.test(m);
  })();

  return (
    <>
      <label className="setup-label" htmlFor={id("weddingSiteURL")}>
        {t("setup.mapUrlLabel")}
        {siteUrl && isSiteUrlValid ? (
          <span style={{ color: "#22c55e", fontSize: "0.8rem", marginLeft: "0.5rem" }}>✓ {t("setup.mapUrlOk")}</span>
        ) : siteUrl && !isSiteUrlValid ? (
          <span style={{ color: "#ef4444", fontSize: "0.8rem", marginLeft: "0.5rem" }}>✗ {t("setup.mapUrlInvalid")}</span>
        ) : null}
      </label>
      <input
        id={id("weddingSiteURL")}
        className="setup-input"
        value={formData.weddingSiteURL || ""}
        onChange={handleSiteUrlChange}
        placeholder={t("setup.mapUrlPlaceholder")}
        autoComplete="off"
        aria-describedby={id("mapUrlHelp")}
        style={siteUrl && !isSiteUrlValid ? { borderColor: "#ef4444" } : siteUrl && isSiteUrlValid ? { borderColor: "#22c55e" } : undefined}
      />
      <p className="setup-help" id={id("mapUrlHelp")}>{t("setup.mapUrlHowTo")}</p>

      <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        <div>
          <label className="setup-label" htmlFor={id("weddingMapView")}>{t("setup.mapViewLabel")}</label>
          <select
            id={id("weddingMapView")}
            className="setup-input"
            value={formData.weddingMapView || "roadmap"}
            onChange={(e) => updateFormField("weddingMapView", e.target.value)}
            aria-describedby={id("mapViewHint")}
          >
            <option value="roadmap">{t("setup.mapViewRoadmap")}</option>
            <option value="satellite">{t("setup.mapViewSatellite")}</option>
            <option value="hybrid">{t("setup.mapViewHybrid")}</option>
          </select>
          <p className="setup-help" id={id("mapViewHint")}>{t("setup.mapViewHint")}</p>
        </div>
        <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.9rem", cursor: "pointer", marginTop: "1.5rem" }}>
          <input
            id={id("weddingMapStatic")}
            type="checkbox"
            checked={formData.weddingMapStatic === "true"}
            onChange={(e) => updateFormField("weddingMapStatic", e.target.checked ? "true" : "false")}
            style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
            aria-describedby={id("mapStaticHint")}
          />
          <span>{t("setup.mapStaticLabel")}</span>
        </label>
      </div>
      {formData.weddingMapStatic === "true" ? (
        <p className="setup-help" id={id("mapStaticHint")}>{t("setup.mapStaticHint")}</p>
      ) : null}

      {siteUrl && !isSiteUrlValid ? (
        <div style={{
          marginTop: "0.5rem", padding: "0.5rem 0.6rem", borderRadius: "0.6rem",
          background: "color-mix(in srgb, #ef4444 10%, transparent)",
          border: "1px solid color-mix(in srgb, #ef4444 35%, transparent)",
          fontSize: "0.82rem", lineHeight: 1.4,
        }}>
          {t("setup.mapUrlInvalidInfo")}
        </div>
      ) : siteUrl && isSiteUrlValid ? (
        <div style={{
          marginTop: "0.5rem", padding: "0.5rem 0.6rem", borderRadius: "0.6rem",
          background: "color-mix(in srgb, #22c55e 10%, transparent)",
          border: "1px solid color-mix(in srgb, #22c55e 35%, transparent)",
          fontSize: "0.82rem", lineHeight: 1.4,
        }}>
          ✓ {t("setup.mapUrlValidInfo")}
        </div>
      ) : null}

      {siteName ? (
        <p className="setup-help" style={{ color: "var(--setup-accent)", fontWeight: 600 }}>
          {t("setup.siteNameLabel")}: {siteName}
        </p>
      ) : null}

      {embedUrl ? (
        <div style={{ marginTop: "0.75rem" }}>
          <p className="setup-label setup-label--tight">{t("setup.mapPreview")}</p>
          <div style={{ position: "relative" }}>
            <iframe
              title="Google Maps preview"
              src={embedUrl}
              width="100%"
              height="250"
              className="story-map-frame"
              style={{ marginTop: "0.35rem", touchAction: formData.weddingMapStatic === "true" ? "none" : undefined }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {formData.weddingMapStatic === "true" ? (
              <div aria-hidden="true" style={{ position: "absolute", inset: 0 }} />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="story-divider" />

      <div className="setup-date-grid">
        <div>
          <label className="setup-label setup-label--required" htmlFor={id("weddingDay")}>{t("setup.dayLabel")}</label>
          <input
            id={id("weddingDay")}
            value={formData.weddingDay}
            onChange={(e) => handleDayChange(e.target.value)}
            placeholder={t("setup.dayPlaceholder")}
            inputMode="numeric" autoComplete="off" min="1" max="31" maxLength={2} pattern="[0-9]*" aria-describedby={id("dateHelp")}
            aria-invalid={dayError || undefined}
            className={dayError ? "setup-input setup-input--error" : "setup-input"}
          />
        </div>
        <div>
          <label className="setup-label setup-label--required" htmlFor={id("weddingMonth")}>{t("setup.monthLabel")}</label>
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
          <label className="setup-label setup-label--required" htmlFor={id("weddingYear")}>{t("setup.yearLabel")}</label>
          <input
            id={id("weddingYear")} value={formData.weddingYear}
            onChange={(e) => handleYearChange(e.target.value)}
            placeholder={t("setup.yearPlaceholder")} inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]*" aria-describedby={id("dateHelp") + " " + id("yearMaxHint")}
            aria-invalid={yearError || undefined}
            className={yearError ? "setup-input setup-input--error" : "setup-input"}
          />
          <p className="setup-help" id={id("yearMaxHint")}>{t("setup.yearMaxHint", { year: maxAllowedYear })}</p>
        </div>
      </div>

      <p className="setup-help" id={id("dateHelp")}>{t("setup.dateHint")}</p>

      <div className="setup-date-grid">
        <div>
          <label className="setup-label setup-label--required" htmlFor={id("weddingHour")}>{t("setup.hourLabel")}</label>
          <input
            id={id("weddingHour")} value={formData.weddingHour}
            onChange={(e) => handleHourChange(e.target.value)}
            placeholder={t("setup.hourPlaceholder")} inputMode="numeric" autoComplete="off" min="0" max="23" maxLength={2} pattern="[0-9]*" aria-describedby={id("timeHelp")}
            aria-invalid={hourError || undefined}
            className={hourError ? "setup-input setup-input--error" : "setup-input"}
          />
        </div>
        <div>
          <label className="setup-label setup-label--required" htmlFor={id("weddingMinute")}>{t("setup.minuteLabel")}</label>
          <input
            id={id("weddingMinute")} value={formData.weddingMinute}
            onChange={(e) => handleMinuteChange(e.target.value)} onBlur={handleMinuteBlur}
            placeholder={t("setup.minutePlaceholder")} inputMode="numeric" autoComplete="off" min="0" max="59" maxLength={2} pattern="[0-9]*" aria-describedby={id("timeHelp")}
            aria-invalid={minuteError || undefined}
            className={minuteError ? "setup-input setup-input--error" : "setup-input"}
          />
        </div>
      </div>

      <p className="setup-help" id={id("timeHelp")}>{t("setup.timeHint")}</p>

      <label className="setup-label" htmlFor={id("weddingSchedule")}>{t("setup.scheduleLabel")} <CharacterCounter current={(formData.weddingSchedule || "").length} max={2000} /></label>
      <textarea
        id={id("weddingSchedule")} className="setup-textarea" value={formData.weddingSchedule}
        onChange={(e) => updateFormField("weddingSchedule", e.target.value.slice(0, 2000))}
        placeholder={t("setup.schedulePlaceholder")} rows={4} maxLength={2000} autoComplete="off" aria-describedby={id("scheduleHelp")}
      />
      <p className="setup-help" id={id("scheduleHelp")}>{t("setup.scheduleHint")}</p>
    </>
  );
}
