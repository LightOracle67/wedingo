import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useConfig } from "../../contexts";
import { useJsonArrayField } from "../../hooks/useJsonArrayField";
import MapUrlField from "../MapUrlField";

interface Departure {
  type: "bus" | "taxi";
  time: string;
  url: string;
}

const MAX_DEPARTURES = 4;

export default function TransportSectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useConfig();
  const { t } = useTranslation();
  const id = (name: string) => `${prefix}${name}`;

  const normalizeDeparture = useCallback((d: unknown): Departure | null => {
    if (!d || typeof d !== "object") return null;
    const rec = d as Record<string, unknown>;
    return {
      type: rec.type === "taxi" ? ("taxi" as const) : ("bus" as const),
      time: typeof rec.time === "string" ? rec.time : "",
      url: typeof rec.url === "string" ? rec.url : "",
    };
  }, []);

  const {
    items: departures,
    addItem: addDeparture,
    removeItem: removeDeparture,
    updateItem: updateDeparture,
  } = useJsonArrayField<Departure>(formData.transportDepartures || "", normalizeDeparture, MAX_DEPARTURES);

  const setDepartures = useCallback(
    (next: Departure[]) => {
      updateFormField("transportDepartures", JSON.stringify(next.slice(0, MAX_DEPARTURES)));
    },
    [updateFormField],
  );

  const enabled = (formData.transportEnabled || "none") as "none" | "bus" | "taxi" | "both";

  const handleEnabledChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value;
      updateFormField("transportEnabled", next);
      if (next === "bus" || next === "taxi") {
        setDepartures(departures.map((d) => ({ ...d, type: next as "bus" | "taxi" })));
      }
    },
    [departures, setDepartures, updateFormField],
  );

  const handleDepartureField = useCallback(
    (index: number, field: "type" | "time" | "url") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      updateDeparture(
        index,
        { ...(departures[index] ?? { type: "bus", time: "", url: "" }), [field]: e.target.value },
        (json) => updateFormField("transportDepartures", json),
      );
    },
    [departures, updateDeparture, updateFormField],
  );

  const handleAddDeparture = useCallback(() => {
    addDeparture({ type: enabled === "taxi" ? "taxi" : "bus", time: "", url: "" }, (json) =>
      updateFormField("transportDepartures", json),
    );
  }, [addDeparture, enabled, updateFormField]);

  const handleRemoveDeparture = useCallback(
    (index: number) => {
      removeDeparture(index, (json) => updateFormField("transportDepartures", json));
    },
    [removeDeparture, updateFormField],
  );

  return (
    <>
      <label className="setup-label" htmlFor={id("transportEnabled")}>
        {t("setup.transportEnabledLabel")}
      </label>
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
      <p className="setup-help" id={id("transportEnabledHint")}>
        {t("setup.transportEnabledHint")}
      </p>

      {enabled !== "none" ? (
        <>
          <div className="story-divider" />
          <label className="setup-label" htmlFor={id("transportMapMode")}>
            {t("setup.mapModeLabel")}
          </label>
          <select
            id={id("transportMapMode")}
            className="setup-input"
            value={formData.transportMapMode || "iframe"}
            onChange={(e) => updateFormField("transportMapMode", e.target.value)}
            aria-describedby={id("transportMapModeHint")}
          >
            <option value="iframe">{t("setup.mapModeIframe")}</option>
            <option value="name">{t("setup.mapModeName")}</option>
            <option value="hidden">{t("setup.mapModeHidden")}</option>
          </select>
          <p className="setup-help" id={id("transportMapModeHint")}>
            {t("setup.mapModeHint")}
          </p>

          <div className="story-divider" />
          <p className="setup-label">{t("setup.transportDeparturesLabel")}</p>
          <p className="setup-help">{t("setup.transportDeparturesHint")}</p>

          {departures.map((dep, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
                marginTop: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "0 0 120px" }}>
                <label className="setup-label" htmlFor={id(`departureType${i}`)} style={{ fontSize: "0.75rem" }}>
                  {t("setup.transportTypeLabel")}
                </label>
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
                <label className="setup-label" htmlFor={id(`departureTime${i}`)} style={{ fontSize: "0.75rem" }}>
                  {t("setup.transportTimeLabel")}
                </label>
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
                </label>
                <MapUrlField
                  id={id(`departureUrl${i}`)}
                  value={dep.url}
                  onChange={(url) =>
                    updateDeparture(i, { ...dep, url }, (json) => updateFormField("transportDepartures", json))
                  }
                  placeholder="https://www.google.com/maps/place/..."
                  placeHintId={id(`departurePlace${i}`)}
                  placeLabel={t("setup.siteNameLabel")}
                />
              </div>
              <button
                type="button"
                className="setup-button setup-button--ghost setup-button--compact"
                onClick={() => handleRemoveDeparture(i)}
                style={{ marginTop: "1.4rem", flexShrink: 0 }}
                aria-label={t("setup.transportRemoveDeparture")}
              >
                âœ•
              </button>
            </div>
          ))}

          {departures.length < MAX_DEPARTURES ? (
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={handleAddDeparture}
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
