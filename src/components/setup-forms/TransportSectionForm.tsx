import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";
import { isValidGoogleMapsUrl, extractPlaceNameFromUrl } from "../../lib/geo-utils";

interface Departure {
  type: "bus" | "taxi";
  time: string;
  url: string;
}

const MAX_DEPARTURES = 4;

export default function TransportSectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useApp();
  const { t } = useTranslation();
  const id = (name: string) => `${prefix}${name}`;

  const departures: Departure[] = (() => {
    try {
      const parsed = JSON.parse(formData.transportDepartures || "");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .slice(0, MAX_DEPARTURES)
        .map((d: Record<string, unknown>) => ({
          type: d.type === "taxi" ? "taxi" as const : "bus" as const,
          time: typeof d.time === "string" ? d.time : "",
          url: typeof d.url === "string" ? d.url : "",
        }));
    } catch {
      return [];
    }
  })();

  const setDepartures = useCallback((next: Departure[]) => {
    updateFormField("transportDepartures", JSON.stringify(next.slice(0, MAX_DEPARTURES)));
  }, [updateFormField]);

  const enabled = (formData.transportEnabled || "none") as "none" | "bus" | "taxi" | "both";

  const handleEnabledChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    updateFormField("transportEnabled", next);
    if (next === "bus" || next === "taxi") {
      setDepartures(departures.map((d) => ({ ...d, type: next as "bus" | "taxi" })));
    }
  }, [departures, setDepartures, updateFormField]);

  const handleDepartureField = useCallback((index: number, field: "type" | "time" | "url") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const next = [...departures];
      next[index] = { ...(next[index] ?? { type: "bus", time: "", url: "" }), [field]: e.target.value };
      setDepartures(next);
    }, [departures, setDepartures]);

  const addDeparture = useCallback(() => {
    if (departures.length >= MAX_DEPARTURES) return;
    setDepartures([...departures, { type: enabled === "taxi" ? "taxi" : "bus", time: "", url: "" }]);
  }, [departures, enabled, setDepartures]);

  const removeDeparture = useCallback((index: number) => {
    const next = departures.filter((_, i) => i !== index);
    setDepartures(next);
  }, [departures, setDepartures]);

  return (
    <>
      <label className="setup-label" htmlFor={id("transportEnabled")}>{t("setup.transportEnabledLabel")}</label>
      <select
        id={id("transportEnabled")}
        className="setup-input"
        value={formData.transportEnabled || "none"}
        onChange={handleEnabledChange}
        aria-describedby={id("transportEnabledHint")}
      >
        <option value="none">{t("setup.transportOptionNone")}</option>
        <option value="bus">{t("setup.transportOptionBus")}</option>
        <option value="taxi">{t("setup.transportOptionTaxi")}</option>
        <option value="both">{t("setup.transportOptionBoth")}</option>
      </select>
      <p className="setup-help" id={id("transportEnabledHint")}>{t("setup.transportEnabledHint")}</p>

      {enabled !== "none" ? (
        <>
          <div className="story-divider" />
          <p className="setup-label">{t("setup.transportDeparturesLabel")}</p>
          <p className="setup-help">{t("setup.transportDeparturesHint")}</p>

          {departures.map((dep, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 120px" }}>
                <label className="setup-label" htmlFor={id(`departureType${i}`)} style={{ fontSize: "0.75rem" }}>{t("setup.transportTypeLabel")}</label>
                <select
                  id={id(`departureType${i}`)}
                  className="setup-input"
                  value={enabled === "both" ? dep.type : enabled}
                  onChange={handleDepartureField(i, "type")}
                  disabled={enabled !== "both"}
                >
                  <option value="bus">{t("setup.transportOptionBus")}</option>
                  <option value="taxi">{t("setup.transportOptionTaxi")}</option>
                </select>
              </div>
              <div style={{ flex: "0 0 90px" }}>
                <label className="setup-label" htmlFor={id(`departureTime${i}`)} style={{ fontSize: "0.75rem" }}>{t("setup.transportTimeLabel")}</label>
                <input
                  id={id(`departureTime${i}`)}
                  className="setup-input"
                  type="time"
                  value={dep.time}
                  onChange={handleDepartureField(i, "time")}
                  required
                  aria-required="true"
                />
              </div>
              <div className="transport-departure-url">
                <label className="setup-label" htmlFor={id(`departureUrl${i}`)} style={{ fontSize: "0.75rem" }}>
                  {t("setup.transportUrlLabel")}
                  {dep.url && !isValidGoogleMapsUrl(dep.url) ? (
                    <span style={{ color: "#ef4444", marginLeft: "0.4rem" }}>{t("setup.mapUrlInvalid")}</span>
                  ) : null}
                </label>
                <input
                  id={id(`departureUrl${i}`)}
                  className={dep.url && !isValidGoogleMapsUrl(dep.url) ? "setup-input setup-input--error" : "setup-input"}
                  value={dep.url}
                  onChange={handleDepartureField(i, "url")}
                  placeholder="https://www.google.com/maps/place/..."
                  autoComplete="off"
                  aria-describedby={dep.url && isValidGoogleMapsUrl(dep.url) ? id(`departurePlace${i}`) : undefined}
                />
                {dep.url && isValidGoogleMapsUrl(dep.url) ? (() => {
                  const placeName = extractPlaceNameFromUrl(dep.url);
                  return placeName ? (
                    <p className="setup-help" id={id(`departurePlace${i}`)} style={{ marginTop: "0.15rem", fontSize: "0.75rem", color: "var(--setup-accent)" }}>
                      {t("setup.siteNameLabel")}: {placeName}
                    </p>
                  ) : null;
                })() : null}
              </div>
              <button
                type="button"
                className="setup-button setup-button--ghost setup-button--compact"
                onClick={() => removeDeparture(i)}
                style={{ marginTop: "1.4rem", flexShrink: 0 }}
                aria-label={t("setup.transportRemoveDeparture")}
              >
                ✕
              </button>
            </div>
          ))}

          {departures.length < MAX_DEPARTURES ? (
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={addDeparture}
              style={{ marginTop: "0.6rem" }}
            >
              + {t("setup.transportAddDeparture")}
            </button>
          ) : null}
          {departures.length >= MAX_DEPARTURES ? (
            <p className="setup-help">{t("setup.transportMaxDepartures", { max: MAX_DEPARTURES })}</p>
          ) : null}
        </>
      ) : null}
    </>
  );
}
