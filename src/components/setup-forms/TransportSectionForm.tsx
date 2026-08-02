import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";
import { isValidGoogleMapsUrl } from "../../lib/geo-utils";

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
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const handleEnabledChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFormField("transportEnabled", e.target.value);
  }, [updateFormField]);

  const setDepartures = useCallback((next: Departure[]) => {
    updateFormField("transportDepartures", JSON.stringify(next.slice(0, MAX_DEPARTURES)));
  }, [updateFormField]);

  const handleDepartureField = useCallback((index: number, field: "type" | "time" | "url") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const next = [...departures];
      next[index] = { ...(next[index] ?? { type: "bus", time: "", url: "" }), [field]: e.target.value };
      setDepartures(next);
    }, [departures, setDepartures]);

  const addDeparture = useCallback(() => {
    if (departures.length >= MAX_DEPARTURES) return;
    setDepartures([...departures, { type: "bus", time: "", url: "" }]);
  }, [departures, setDepartures]);

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
      >
        <option value="none">{t("setup.transportOptionNone")}</option>
        <option value="bus">{t("setup.transportOptionBus")}</option>
        <option value="taxi">{t("setup.transportOptionTaxi")}</option>
        <option value="both">{t("setup.transportOptionBoth")}</option>
      </select>
      <p className="setup-help">{t("setup.transportEnabledHint")}</p>

      {(formData.transportEnabled || "none") !== "none" ? (
        <>
          <div className="story-divider" />
          <label className="setup-label">{t("setup.transportDeparturesLabel")}</label>
          <p className="setup-help">{t("setup.transportDeparturesHint")}</p>

          {departures.map((dep, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 120px" }}>
                <label className="setup-label" htmlFor={id(`departureType${i}`)} style={{ fontSize: "0.75rem" }}>{t("setup.transportTypeLabel")}</label>
                <select
                  id={id(`departureType${i}`)}
                  className="setup-input"
                  value={dep.type}
                  onChange={handleDepartureField(i, "type")}
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
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="setup-label" htmlFor={id(`departureUrl${i}`)} style={{ fontSize: "0.75rem" }}>
                  {t("setup.transportUrlLabel")}
                  {dep.url && !isValidGoogleMapsUrl(dep.url) ? (
                    <span style={{ color: "#ef4444", marginLeft: "0.4rem" }}>{t("setup.mapUrlInvalid")}</span>
                  ) : null}
                </label>
                <input
                  id={id(`departureUrl${i}`)}
                  className="setup-input"
                  value={dep.url}
                  onChange={handleDepartureField(i, "url")}
                  placeholder="https://www.google.com/maps/place/..."
                  autoComplete="off"
                />
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
