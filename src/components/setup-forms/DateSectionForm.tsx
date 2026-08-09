import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useConfig, useFormField } from "../../contexts";
import {
  MONTH_OPTIONS,
  MONTH_VALUE_TO_NUMBER,
  MAX_SCHEDULE_EVENTS,
  MAX_SCHEDULE_EVENT_TEXT,
  SCHEDULE_EVENT_EMOJIS,
} from "../../lib/constants";
import { isValidGoogleMapsUrl, convertToEmbedUrl, extractPlaceNameFromUrl } from "../../lib/geo-utils";
import { useJsonArrayField } from "../../hooks/useJsonArrayField";
import MapUrlField from "../MapUrlField";
import SetupToggleField from "../SetupToggleField";

interface ScheduleEvent {
  time: string;
  text: string;
  emoji: string;
}

export default function DateSectionForm({ prefix = "" }) {
  const { updateFormField, handleDayChange, handleYearChange, handleTimeChange, handleTimeBlur, maxAllowedYear } = useConfig();
  const detailsMapMode = useFormField("detailsMapMode");
  const weddingDay = useFormField("weddingDay");
  const weddingHour = useFormField("weddingHour");
  const weddingMapStatic = useFormField("weddingMapStatic");
  const weddingMapView = useFormField("weddingMapView");
  const weddingMinute = useFormField("weddingMinute");
  const weddingMonth = useFormField("weddingMonth");
  const weddingScheduleEvents = useFormField("weddingScheduleEvents");
  const weddingSiteURL = useFormField("weddingSiteURL");
  const weddingYear = useFormField("weddingYear");
  const { t, i18n } = useTranslation();
  const id = (name: string) => `${prefix}${name}`;

  const siteUrl = weddingSiteURL?.trim() || "";
  const isSiteUrlValid = siteUrl ? isValidGoogleMapsUrl(siteUrl) : false;

  const embedUrl = useMemo(() => {
    if (!isSiteUrlValid) return "";
    return convertToEmbedUrl(siteUrl, weddingMapView || "roadmap", i18n.language);
  }, [siteUrl, isSiteUrlValid, weddingMapView, i18n.language]);

  const siteName = useMemo(() => {
    if (!isSiteUrlValid) return "";
    return extractPlaceNameFromUrl(siteUrl) || "";
  }, [siteUrl, isSiteUrlValid]);

  const dayError = (() => {
    const d = (weddingDay || "").trim();
    if (!d) return false;
    return !/^(0?[1-9]|[12][0-9]|3[01])$/.test(d);
  })();
  const yearError = (() => {
    const y = (weddingYear || "").trim();
    if (!y) return false;
    const n = Number.parseInt(y, 10);
    return !Number.isFinite(n) || y.length !== 4 || n < new Date().getFullYear() - 120 || n > maxAllowedYear;
  })();

  const hourNum = weddingHour ? Number.parseInt(weddingHour, 10) : NaN;
  const minuteNum = weddingMinute ? Number.parseInt(weddingMinute, 10) : NaN;
  const hourValid = Number.isFinite(hourNum) && hourNum >= 0 && hourNum <= 23;
  const minuteValid = Number.isFinite(minuteNum) && minuteNum >= 0 && minuteNum <= 59;
  const timeError = (() => {
    if (!weddingHour && !weddingMinute) return false;
    return !(hourValid && minuteValid);
  })();
  const timeValue =
    hourValid && minuteValid ? `${String(hourNum).padStart(2, "0")}:${String(minuteNum).padStart(2, "0")}` : "";

  const normalizeEvent = useCallback((e: unknown): ScheduleEvent | null => {
    if (!e || typeof e !== "object") return null;
    const rec = e as Record<string, unknown>;
    return {
      time: typeof rec.time === "string" ? rec.time.slice(0, 5) : "",
      text: typeof rec.text === "string" ? rec.text.slice(0, MAX_SCHEDULE_EVENT_TEXT) : "",
      emoji: typeof rec.emoji === "string" ? rec.emoji.slice(0, 8) : "",
    };
  }, []);

  const {
    items: scheduleEvents,
    addItem: addScheduleEvent,
    removeItem: removeScheduleEvent,
    updateItem: updateScheduleEvent,
  } = useJsonArrayField<ScheduleEvent>(weddingScheduleEvents || "", normalizeEvent, MAX_SCHEDULE_EVENTS);

  const handleScheduleEventField = useCallback(
    (index: number, field: "time" | "text" | "emoji") =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        updateScheduleEvent(
          index,
          { ...(scheduleEvents[index] ?? { time: "", text: "", emoji: "" }), [field]: e.target.value },
          (json) => updateFormField("weddingScheduleEvents", json),
        );
      },
    [scheduleEvents, updateScheduleEvent, updateFormField],
  );

  const visibleScheduleEvents = scheduleEvents;

  return (
    <>
      <SetupToggleField
        enabledField="weddingSiteURLEnabled"
        label={t("setup.mapUrlLabel")}
        hint={t("setup.mapUrlHowTo")}
        id={id}
      >
        <MapUrlField
          id={id("weddingSiteURL")}
          value={weddingSiteURL || ""}
          onChange={(url) => updateFormField("weddingSiteURL", url)}
          placeholder={t("setup.mapUrlPlaceholder")}
          hidePlaceName
        />
      </SetupToggleField>

      <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        <div>
          <label className="setup-label" htmlFor={id("weddingMapView")}>
            {t("setup.mapViewLabel")}
          </label>
          <select
            id={id("weddingMapView")}
            className="setup-input"
            value={weddingMapView || "roadmap"}
            onChange={(e) => updateFormField("weddingMapView", e.target.value)}
            aria-describedby={id("mapViewHint")}
          >
            <option value="roadmap">{t("setup.mapViewRoadmap")}</option>
            <option value="satellite">{t("setup.mapViewSatellite")}</option>
            <option value="hybrid">{t("setup.mapViewHybrid")}</option>
          </select>
          <p className="setup-help" id={id("mapViewHint")}>
            {t("setup.mapViewHint")}
          </p>
        </div>
        <div>
          <label className="setup-label" htmlFor={id("detailsMapMode")}>
            {t("setup.mapModeLabel")}
          </label>
          <select
            id={id("detailsMapMode")}
            className="setup-input"
            value={detailsMapMode || "iframe"}
            onChange={(e) => updateFormField("detailsMapMode", e.target.value)}
            aria-describedby={id("mapModeHint")}
          >
            <option value="iframe">{t("setup.mapModeIframe")}</option>
            <option value="name">{t("setup.mapModeName")}</option>
            <option value="hidden">{t("setup.mapModeHidden")}</option>
          </select>
          <p className="setup-help" id={id("mapModeHint")}>
            {t("setup.mapModeHint")}
          </p>
        </div>
        <label
          className="setup-checkbox-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--setup-title)",
            fontSize: "0.9rem",
            cursor: "pointer",
            marginTop: "1.5rem",
          }}
        >
          <input
            id={id("weddingMapStatic")}
            type="checkbox"
            checked={weddingMapStatic === "true"}
            onChange={(e) => updateFormField("weddingMapStatic", e.target.checked ? "true" : "false")}
            style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
            aria-describedby={id("mapStaticHint")}
          />
          <span>{t("setup.mapStaticLabel")}</span>
        </label>
      </div>
      {weddingMapStatic === "true" ? (
        <p className="setup-help" id={id("mapStaticHint")}>
          {t("setup.mapStaticHint")}
        </p>
      ) : null}

      {siteUrl && !isSiteUrlValid ? (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 0.6rem",
            borderRadius: "0.6rem",
            background: "color-mix(in srgb, #ef4444 10%, transparent)",
            border: "1px solid color-mix(in srgb, #ef4444 35%, transparent)",
            fontSize: "0.82rem",
            lineHeight: 1.4,
          }}
        >
          {t("setup.mapUrlInvalidInfo")}
        </div>
      ) : siteUrl && isSiteUrlValid ? (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 0.6rem",
            borderRadius: "0.6rem",
            background: "color-mix(in srgb, #22c55e 10%, transparent)",
            border: "1px solid color-mix(in srgb, #22c55e 35%, transparent)",
            fontSize: "0.82rem",
            lineHeight: 1.4,
          }}
        >
          âœ“ {t("setup.mapUrlValidInfo")}
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
              title={t("setup.mapPreview")}
              src={embedUrl}
              width="100%"
              height="250"
              className="story-map-frame"
              style={{ marginTop: "0.35rem", touchAction: weddingMapStatic === "true" ? "none" : undefined }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {weddingMapStatic === "true" ? (
              <div aria-hidden="true" style={{ position: "absolute", inset: 0 }} />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="story-divider" />

      <div className="setup-date-grid">
        <div>
          <label className="setup-label setup-label--required" htmlFor={id("weddingDay")}>
            {t("setup.dayLabel")}
          </label>
          <input
            id={id("weddingDay")}
            value={weddingDay}
            onChange={(e) => handleDayChange(e.target.value)}
            placeholder={t("setup.dayPlaceholder")}
            inputMode="numeric"
            autoComplete="off"
            min="1"
            max="31"
            maxLength={2}
            pattern="[0-9]*"
            aria-describedby={id("dateHelp")}
            aria-invalid={dayError || undefined}
            required
            aria-required="true"
            className={dayError ? "setup-input setup-input--error" : "setup-input"}
          />
        </div>
        <div>
          <label className="setup-label setup-label--required" htmlFor={id("weddingMonth")}>
            {t("setup.monthLabel")}
          </label>
          <select
            id={id("weddingMonth")}
            className="setup-input"
            value={weddingMonth}
            onChange={(e) => updateFormField("weddingMonth", e.target.value)}
            aria-describedby={id("dateHelp")}
            required
            aria-required="true"
          >
            <option value="" disabled>
              {t("setup.monthPlaceholder")}
            </option>
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {t("monthNames." + (MONTH_VALUE_TO_NUMBER[month.value] || ""))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="setup-label setup-label--required" htmlFor={id("weddingYear")}>
            {t("setup.yearLabel")}
          </label>
          <input
            id={id("weddingYear")}
            value={weddingYear}
            onChange={(e) => handleYearChange(e.target.value)}
            placeholder={t("setup.yearPlaceholder")}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            pattern="[0-9]*"
            aria-describedby={id("dateHelp") + " " + id("yearMaxHint")}
            aria-invalid={yearError || undefined}
            required
            aria-required="true"
            className={yearError ? "setup-input setup-input--error" : "setup-input"}
          />
          <p className="setup-help" id={id("yearMaxHint")}>
            {t("setup.yearMaxHint", { year: maxAllowedYear })}
          </p>
        </div>
        <div>
          <label className="setup-label setup-label--required" htmlFor={id("weddingTime")}>
            {t("setup.timeInputLabel")}
          </label>
          <input
            id={id("weddingTime")}
            type="time"
            value={timeValue}
            onChange={(e) => handleTimeChange(e.target.value)}
            onBlur={(e) => handleTimeBlur(e.target.value)}
            autoComplete="off"
            aria-describedby={id("timeHelp")}
            aria-invalid={timeError || undefined}
            required
            aria-required="true"
            className={timeError ? "setup-input setup-input--error" : "setup-input"}
          />
        </div>
      </div>

      <p className="setup-help" id={id("dateHelp")}>
        {t("setup.dateHint")}
      </p>

      <p className="setup-help" id={id("timeHelp")}>
        {t("setup.timeHint")}
      </p>

      <p className="setup-label" id={id("scheduleEventsLabel")}>
        {t("setup.scheduleLabel")}
      </p>
      <p className="setup-help" id={id("scheduleEventsHint")}>
        {t("setup.scheduleEventsHint", { max: MAX_SCHEDULE_EVENTS })}
      </p>

      <div role="group" aria-labelledby={id("scheduleEventsLabel")} aria-describedby={id("scheduleEventsHint")}>
        {visibleScheduleEvents.map((ev, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem", flexWrap: "wrap" }}
          >
            <div style={{ flex: "0 0 110px" }}>
              <label className="setup-label" htmlFor={id(`scheduleEventTime${i}`)} style={{ fontSize: "0.75rem" }}>
                {t("setup.scheduleEventTimeLabel")}
              </label>
              <input
                id={id(`scheduleEventTime${i}`)}
                className="setup-input"
                type="time"
                value={ev.time}
                onChange={handleScheduleEventField(i, "time")}
              />
            </div>
            <div>
              <label className="setup-label" htmlFor={id(`scheduleEventEmoji${i}`)} style={{ fontSize: "0.75rem" }}>
                {t("setup.scheduleEventEmojiLabel")}
              </label>
              <select
                id={id(`scheduleEventEmoji${i}`)}
                className="setup-input"
                value={ev.emoji}
                onChange={handleScheduleEventField(i, "emoji")}
                style={{ width: "100%", textAlign: "center" }}
              >
                {/* Primera opciÃ³n vacÃ­a: evento sin emoji. */}
                <option value="">â€”</option>
                {SCHEDULE_EVENT_EMOJIS.map((emoji) => (
                  <option key={emoji} value={emoji}>
                    {emoji}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="setup-label" htmlFor={id(`scheduleEventText${i}`)} style={{ fontSize: "0.75rem" }}>
                {t("setup.scheduleEventTextLabel")}
              </label>
              <input
                id={id(`scheduleEventText${i}`)}
                className="setup-input"
                type="text"
                value={ev.text}
                onChange={handleScheduleEventField(i, "text")}
                placeholder={t("setup.scheduleEventTextPlaceholder")}
                maxLength={MAX_SCHEDULE_EVENT_TEXT}
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={() => removeScheduleEvent(i, (json) => updateFormField("weddingScheduleEvents", json))}
              style={{ marginTop: "1.4rem", flexShrink: 0 }}
              aria-label={t("setup.scheduleRemoveEvent")}
            >
              âœ•
            </button>
          </div>
        ))}
      </div>

      {visibleScheduleEvents.length < MAX_SCHEDULE_EVENTS ? (
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={() =>
            addScheduleEvent({ time: "", text: "", emoji: "" }, (json) =>
              updateFormField("weddingScheduleEvents", json),
            )
          }
          style={{ marginTop: "0.6rem" }}
        >
          + {t("setup.scheduleAddEvent")}
        </button>
      ) : null}
      {visibleScheduleEvents.length >= MAX_SCHEDULE_EVENTS ? (
        <p className="setup-help">{t("setup.scheduleMaxEvents", { max: MAX_SCHEDULE_EVENTS })}</p>
      ) : null}
    </>
  );
}
