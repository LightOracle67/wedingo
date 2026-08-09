import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useConfig, useAppUI, useAuth } from "../../contexts";
import { extractPlaceNameFromUrl } from "../../lib/geo-utils";
import { parseMenuDishes } from "../../lib/menu-utils";
import { parseTransportDepartures } from "../../lib/transport-utils";
import CornerDecorations from "../../components/CornerDecorations";

const ALLERGIES = ["sin gluten", "sin lactosa", "alergia frutos secos", "alergia mariscos"];

interface RsvpFormState {
  guestName: string;
  attendance: string;
  birthDate: string;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  companionBirthDates?: string[];
  companionParentalConsents?: boolean[];
  companionHealthConsents?: boolean[];
  companionTransportChoices?: string[];
  companionTransportModes?: string[];
  menuSelection: string;
  allergies: string[];
  allergiesOther: string;
  parentalConsent: boolean;
  privacyConsent: boolean;
  healthConsent: boolean;
  transportChoice: string;
  transportMode: string;
}

interface Departure {
  type?: "bus" | "taxi";
  time: string;
  url: string;
}

interface RsvpSectionProps {
  style?: React.CSSProperties;
  className?: string;
  rsvpForm: RsvpFormState;
  rsvpMessage?: string;
  isRsvpSubmitting?: boolean;
  hasSubmitted?: boolean;
  alreadySubmittedEntry?: unknown;
  /** Error de red al cargar las respuestas (botón "Reintentar" del invitado). */
  rsvpLoadError?: boolean;
  retryLoadRsvp?: () => void;
  updateRsvpField: (field: string, value: string | boolean | number | string[] | string[][] | boolean[]) => void;
  handleRsvpSubmit: (e: React.FormEvent) => void;
  handleDeleteRsvp: () => void;
  menuEnabled?: boolean;
  menuCarneDishes?: string;
  menuPescadoDishes?: string;
  menuVeganoDishes?: string;
  menuTextoDishes?: string;
  transportEnabled?: string;
  transportDepartures?: string;
  computeAge: (birthDate: string) => number | null;
  cornerDecoration?: string;
}

const RsvpSection = memo(function RsvpSection({
  style,
  className,
  rsvpForm,
  rsvpMessage,
  isRsvpSubmitting,
  hasSubmitted,
  alreadySubmittedEntry,
  rsvpLoadError,
  retryLoadRsvp,
  updateRsvpField,
  handleRsvpSubmit,
  handleDeleteRsvp,
  menuEnabled,
  menuCarneDishes,
  menuPescadoDishes,
  menuVeganoDishes,
  menuTextoDishes,
  transportEnabled,
  transportDepartures,
  computeAge,
  cornerDecoration,
}: RsvpSectionProps) {
  const { t } = useTranslation();
  const { setLegalModal } = useAppUI();
  // El botón "Retirar respuesta" solo funciona con sesión de admin (las reglas
  // Firestore exigen isSuperAdmin o hasActiveSession): para el invitado sin
  // sesión se oculta, ya que de otro modo se mostraría un botón que siempre
  // fallaría con permission-denied.
  const { isAdminTokenLoggedIn } = useAuth();
  const { config } = useConfig();

  // Fecha límite de confirmación: si la invitación tiene una y ya pasó, el
  // formulario se bloquea y se muestra el aviso.
  const deadlinePassed =
    config?.rsvpDeadlineEnabled === "true" &&
    !!config.rsvpDeadline &&
    new Date(`${config.rsvpDeadline}T23:59:59`) < new Date();
  const isAlreadySubmitted = !!alreadySubmittedEntry;
  const isDisabled = isRsvpSubmitting || hasSubmitted || isAlreadySubmitted || deadlinePassed;
  const isAttending = rsvpForm.attendance !== "no";

  const age = useMemo(() => computeAge(rsvpForm.birthDate), [rsvpForm.birthDate, computeAge]);
  const isUnder14 = age !== null && age < 14;
  const hasDietaryData = (rsvpForm.allergies || []).length > 0 || (rsvpForm.allergiesOther || "").trim().length > 0;
  const showHealthConsent = isAttending && hasDietaryData;

  const hasStructuredMenu = menuEnabled && (menuCarneDishes || menuPescadoDishes || menuVeganoDishes);

  const formatDishes = useCallback(
    (json: string) => {
      const dishes = parseMenuDishes(json);
      return dishes
        .map((d) => `${t("setup.menuOrder" + d.order.charAt(0).toUpperCase() + d.order.slice(1))}: ${d.text}`)
        .join("\n");
    },
    [t],
  );

  const menuOptions = useMemo(
    () => [
      ...(menuCarneDishes
        ? [{ key: "carne" as const, label: t("rsvp.menuCarne"), desc: formatDishes(menuCarneDishes) }]
        : []),
      ...(menuPescadoDishes
        ? [{ key: "pescado" as const, label: t("rsvp.menuPescado"), desc: formatDishes(menuPescadoDishes) }]
        : []),
      ...(menuVeganoDishes
        ? [{ key: "vegano" as const, label: t("rsvp.menuVegano"), desc: formatDishes(menuVeganoDishes) }]
        : []),
    ],
    [menuCarneDishes, menuPescadoDishes, menuVeganoDishes, formatDishes, t],
  );

  const departures: Departure[] = useMemo(() => {
    if (!transportEnabled || transportEnabled === "none") return [];
    return parseTransportDepartures(transportDepartures);
  }, [transportEnabled, transportDepartures]);

  const hasTransportChoices = departures.length > 0;

  const departureLabel = useCallback(
    (dep: Departure) => {
      const typeLabel = t(dep.type === "taxi" ? "transport.typeTaxi" : "transport.typeBus");
      const placeName = dep.url ? extractPlaceNameFromUrl(dep.url) : "";
      if (placeName && dep.time) return `${placeName} (${dep.time})`;
      if (placeName) return placeName;
      return dep.time ? `${dep.time} (${typeLabel})` : typeLabel;
    },
    [t],
  );

  const modeOptions = useMemo(() => {
    const opts: { value: string; labelKey: string }[] = [{ value: "own", labelKey: "rsvp.transportOwnCarOption" }];
    if (transportEnabled === "both" || transportEnabled === "bus") {
      opts.push({ value: "bus", labelKey: "rsvp.transportBusOption" });
    }
    if (transportEnabled === "both" || transportEnabled === "taxi") {
      opts.push({ value: "taxi", labelKey: "rsvp.transportTaxiOption" });
    }
    return opts;
  }, [transportEnabled]);

  const handleTransportModeChange = useCallback(
    (group: "main" | "companion", idx: number, mode: string) => {
      const modeField = group === "main" ? "transportMode" : `companionTransportModes[${idx}]`;
      const choiceField = group === "main" ? "transportChoice" : `companionTransportChoices[${idx}]`;
      const timeField = group === "main" ? "transportTime" : `companionTransportTimes[${idx}]`;
      const placeField = group === "main" ? "transportPlace" : `companionTransportPlaces[${idx}]`;
      updateRsvpField(modeField, mode);
      const first = departures.findIndex((d) => (d.type || "bus") === mode);
      const dep = first >= 0 ? departures[first] : undefined;
      updateRsvpField(choiceField, first >= 0 ? String(first) : "");
      updateRsvpField(timeField, dep?.time || "");
      updateRsvpField(placeField, dep?.url ? extractPlaceNameFromUrl(dep.url) || "" : "");
    },
    [departures, updateRsvpField],
  );

  const handleDepartureChange = useCallback(
    (group: "main" | "companion", idx: number, value: string) => {
      const choiceField = group === "main" ? "transportChoice" : `companionTransportChoices[${idx}]`;
      const timeField = group === "main" ? "transportTime" : `companionTransportTimes[${idx}]`;
      const placeField = group === "main" ? "transportPlace" : `companionTransportPlaces[${idx}]`;
      const depIdx = Number.parseInt(value, 10);
      const dep = Number.isFinite(depIdx) ? departures[depIdx] : undefined;
      updateRsvpField(choiceField, value);
      updateRsvpField(timeField, dep?.time || "");
      updateRsvpField(placeField, dep?.url ? extractPlaceNameFromUrl(dep.url) || "" : "");
    },
    [departures, updateRsvpField],
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateRsvpField("guestName", e.target.value.slice(0, 120));
    },
    [updateRsvpField],
  );

  const handleAttendanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateRsvpField("attendance", e.target.value);
    },
    [updateRsvpField],
  );

  const handleCompanionNameChange = useCallback(
    (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      updateRsvpField(`companionNames[${idx}]`, e.target.value.slice(0, 120));
    },
    [updateRsvpField],
  );

  const handleMenuChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateRsvpField("menuSelection", e.target.value);
    },
    [updateRsvpField],
  );

  const handleAllergyToggle = useCallback(
    (allergy: string) => {
      const current = rsvpForm.allergies || [];
      const updated = current.includes(allergy) ? current.filter((a: string) => a !== allergy) : [...current, allergy];
      updateRsvpField("allergies", updated);
    },
    [rsvpForm.allergies, updateRsvpField],
  );

  const handleBirthDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateRsvpField("birthDate", e.target.value);
    },
    [updateRsvpField],
  );

  const handleParentalConsentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateRsvpField("parentalConsent", e.target.checked);
    },
    [updateRsvpField],
  );

  const handlePrivacyConsentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateRsvpField("privacyConsent", e.target.checked);
    },
    [updateRsvpField],
  );

  const handleHealthConsentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateRsvpField("healthConsent", e.target.checked);
    },
    [updateRsvpField],
  );

  const handleLegalClick = useCallback(() => {
    setLegalModal("privacy");
  }, [setLegalModal]);

  return (
    <section
      data-story-section="rsvp"
      className={`${className} flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10`}
      style={style}
    >
      <div className="story-card-wrap" style={{ width: "min(90%, 42rem)" }}>
        <CornerDecorations src={cornerDecoration} />
        <div className="story-card story-panel story-card--rsvp allow-select w-full text-center">
          <p className="story-eyebrow text-center">{t("rsvp.sectionLabel")}</p>
          <h2 className="story-title text-center">{t("rsvp.title")}</h2>
          <p className="story-copy text-center">{t("rsvp.description")}</p>

          {isAlreadySubmitted && (alreadySubmittedEntry as Record<string, unknown>)?.rsvpType === "companion" ? (
            <div
              className="rsvp-already-badge"
              style={{
                textAlign: "center",
                padding: "0.5rem 1rem",
                marginBottom: "1rem",
                borderRadius: "0.6rem",
                background: "color-mix(in srgb, var(--setup-accent) 15%, transparent)",
                border: "1px solid color-mix(in srgb, var(--setup-accent) 30%, transparent)",
              }}
            >
              <p style={{ color: "var(--setup-accent)", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
                {t("rsvp.companionInfo", {
                  name: (alreadySubmittedEntry as Record<string, unknown>)?.mainGuestName || "",
                })}
              </p>
            </div>
          ) : isAlreadySubmitted ? (
            <div
              className="rsvp-already-badge"
              style={{
                textAlign: "center",
                padding: "0.5rem 1rem",
                marginBottom: "1rem",
                borderRadius: "0.6rem",
                background: "color-mix(in srgb, var(--setup-accent) 15%, transparent)",
                border: "1px solid color-mix(in srgb, var(--setup-accent) 30%, transparent)",
              }}
            >
              <p style={{ color: "var(--setup-accent)", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
                {t("rsvp.alreadySubmitted")}
              </p>
            </div>
          ) : null}

          <form className="rsvp-form" onSubmit={handleRsvpSubmit} noValidate aria-busy={isRsvpSubmitting}>
            {deadlinePassed ? (
              <p className="rsvp-deadline-passed" role="alert">
                {t("rsvp.deadlinePassed")}
              </p>
            ) : null}
            <label className="setup-label" htmlFor="rsvpName">
              {t("rsvp.nameLabel")} *
            </label>
            <input
              id="rsvpName"
              className="setup-input"
              value={rsvpForm.guestName}
              onChange={handleNameChange}
              placeholder={t("rsvp.namePlaceholder")}
              autoComplete="off"
              required
              maxLength={120}
              aria-invalid={Boolean(rsvpMessage) || undefined}
              aria-describedby={rsvpMessage ? "rsvpFeedback" : undefined}
            />
            <p className="setup-help" style={{ marginTop: "0.2rem" }}>
              {t("rsvp.nameHint")}
            </p>

            <div
              className="setup-date-grid rsvp-choice-grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
            >
              <div>
                <label className="setup-label" htmlFor="rsvpAttendance">
                  {t("rsvp.attendanceOptions")} *
                </label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <select
                    id="rsvpAttendance"
                    className="setup-input"
                    value={rsvpForm.attendance}
                    onChange={handleAttendanceChange}
                    required
                    disabled={isAlreadySubmitted}
                    style={{ width: "auto", minWidth: "180px" }}
                  >
                    <option value="alone">{t("rsvp.attendingAlone")}</option>
                    <option value="with">{t("rsvp.attendingWithCompanions")}</option>
                    <option value="no">{t("rsvp.notAttending")}</option>
                  </select>
                  {rsvpForm.attendance === "with" && !isAlreadySubmitted && (rsvpForm.companionCount || 0) < 10 && (
                    <button
                      type="button"
                      className="setup-button setup-button--ghost setup-button--compact"
                      onClick={() => updateRsvpField("companionCount", (rsvpForm.companionCount || 0) + 1)}
                      style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}
                    >
                      + {t("rsvp.addCompanion")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isAttending && hasTransportChoices ? (
              <div className="setup-field" style={{ marginTop: "0.75rem" }}>
                <p className="setup-label" id="rsvpTransportLabel">
                  {t("rsvp.transportLabel")}
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="rsvpTransportLabel"
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {modeOptions.map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.9rem",
                        color: "var(--setup-title)",
                        cursor: isAlreadySubmitted ? "default" : "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="rsvpTransportMode"
                        value={opt.value}
                        checked={(rsvpForm.transportMode || "own") === opt.value}
                        onChange={() => handleTransportModeChange("main", 0, opt.value)}
                        disabled={isAlreadySubmitted}
                        style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                      />
                      {t(opt.labelKey)}
                    </label>
                  ))}
                </div>
                {(() => {
                  const mode = rsvpForm.transportMode || "own";
                  if (mode !== "bus" && mode !== "taxi") return null;
                  return (
                    <>
                      <label
                        className="setup-label"
                        htmlFor="rsvpTransportDeparture"
                        style={{ marginTop: "0.5rem", display: "block" }}
                      >
                        {t("rsvp.transportDepartureLabel")}
                      </label>
                      <select
                        id="rsvpTransportDeparture"
                        className="setup-input"
                        value={rsvpForm.transportChoice || ""}
                        onChange={(e) => handleDepartureChange("main", 0, e.target.value)}
                        disabled={isAlreadySubmitted}
                      >
                        {departures.map((dep, i) =>
                          (dep.type || "bus") === mode ? (
                            <option key={i} value={String(i)}>
                              {departureLabel(dep)}
                            </option>
                          ) : null,
                        )}
                      </select>
                    </>
                  );
                })()}
                <p className="setup-help" style={{ marginTop: "0.2rem" }}>
                  {t("rsvp.transportHint")}
                </p>
              </div>
            ) : null}

            {rsvpForm.attendance === "with" && rsvpForm.companionCount > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                {Array.from({ length: rsvpForm.companionCount }, (_, i) => (
                  <div key={i} className="rsvp-attendee-card">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <h3 style={{ margin: 0 }}>{t("rsvp.companionHeading", { number: i + 1 })}</h3>
                      {i > 0 && (
                        <button
                          type="button"
                          className="rsvp-remove-btn"
                          aria-label={t("common.remove")}
                          onClick={() => updateRsvpField("companionCount", rsvpForm.companionCount - 1)}
                          disabled={isAlreadySubmitted}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <label className="setup-label" htmlFor={`companion-name-${i}`}>
                      {t("rsvp.nameLabel")} *
                    </label>
                    <input
                      id={`companion-name-${i}`}
                      className="setup-input"
                      type="text"
                      value={rsvpForm.companionNames[i] || ""}
                      onChange={handleCompanionNameChange(i)}
                      placeholder={t("rsvp.attendeeNamePlaceholder")}
                      required
                      disabled={isAlreadySubmitted}
                      maxLength={120}
                    />

                    {hasTransportChoices ? (
                      <div style={{ marginTop: "0.5rem" }}>
                        <p className="setup-label" id={`companion-transport-label-${i}`}>
                          {t("rsvp.transportLabel")}
                        </p>
                        <div
                          role="radiogroup"
                          aria-labelledby={`companion-transport-label-${i}`}
                          style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                        >
                          {modeOptions.map((opt) => (
                            <label
                              key={opt.value}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                fontSize: "0.85rem",
                                color: "var(--setup-title)",
                                cursor: isAlreadySubmitted ? "default" : "pointer",
                              }}
                            >
                              <input
                                type="radio"
                                name={`companionTransportMode${i}`}
                                value={opt.value}
                                checked={(rsvpForm.companionTransportModes?.[i] || "own") === opt.value}
                                onChange={() => handleTransportModeChange("companion", i, opt.value)}
                                disabled={isAlreadySubmitted}
                                style={{
                                  accentColor: "var(--setup-accent)",
                                  width: "1rem",
                                  height: "1rem",
                                  flexShrink: 0,
                                }}
                              />
                              {t(opt.labelKey)}
                            </label>
                          ))}
                        </div>
                        {(() => {
                          const mode = rsvpForm.companionTransportModes?.[i] || "own";
                          if (mode !== "bus" && mode !== "taxi") return null;
                          return (
                            <>
                              <label
                                className="setup-label"
                                htmlFor={`companion-departure-${i}`}
                                style={{ marginTop: "0.5rem", display: "block", fontSize: "0.85rem" }}
                              >
                                {t("rsvp.transportDepartureLabel")}
                              </label>
                              <select
                                id={`companion-departure-${i}`}
                                className="setup-input"
                                value={rsvpForm.companionTransportChoices?.[i] || ""}
                                onChange={(e) => handleDepartureChange("companion", i, e.target.value)}
                                disabled={isAlreadySubmitted}
                              >
                                {departures.map((dep, i) =>
                                  (dep.type || "bus") === mode ? (
                                    <option key={i} value={String(i)}>
                                      {departureLabel(dep)}
                                    </option>
                                  ) : null,
                                )}
                              </select>
                            </>
                          );
                        })()}
                      </div>
                    ) : null}

                    {hasStructuredMenu && (
                      <>
                        <label className="setup-label" htmlFor={`companion-menu-${i}`} style={{ marginTop: "0.5rem" }}>
                          {t("rsvp.menuLabel")}
                        </label>
                        <select
                          id={`companion-menu-${i}`}
                          className="setup-input"
                          value={rsvpForm.companionMenus[i] || ""}
                          onChange={(e) => updateRsvpField(`companionMenus[${i}]`, e.target.value)}
                          disabled={isAlreadySubmitted}
                        >
                          <option value="">{t("rsvp.menuPlaceholder")}</option>
                          {menuOptions.map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        {rsvpForm.companionMenus[i] ? (
                          <div
                            style={{
                              marginTop: "0.35rem",
                              padding: "0.4rem 0.6rem",
                              borderRadius: "0.5rem",
                              background: "color-mix(in srgb, var(--setup-accent) 8%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--setup-accent) 15%, transparent)",
                              fontSize: "0.8rem",
                              lineHeight: 1.4,
                              color: "var(--setup-title, #fdf8ec)",
                            }}
                          >
                            {menuOptions.find((m) => m.key === rsvpForm.companionMenus[i])?.desc}
                          </div>
                        ) : null}
                      </>
                    )}

                    <fieldset style={{ border: "none", padding: 0, margin: "0.5rem 0 0 0" }}>
                      <legend className="setup-label" style={{ fontSize: "0.85rem" }}>
                        {t("rsvp.allergiesLegend")}
                      </legend>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {ALLERGIES.map((a) => (
                          <label
                            key={a}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.85rem",
                              cursor: isDisabled ? "default" : "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={(rsvpForm.companionAllergies[i] || []).includes(a)}
                              onChange={() => {
                                const current = rsvpForm.companionAllergies[i] || [];
                                const updated = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
                                updateRsvpField(`companionAllergies[${i}]`, updated);
                              }}
                              disabled={isAlreadySubmitted}
                            />
                            {t(`rsvp.allergies.${a}`, { defaultValue: a })}
                          </label>
                        ))}
                      </div>
                      <input
                        className="setup-input"
                        type="text"
                        value={rsvpForm.companionAllergiesOther?.[i] || ""}
                        onChange={(e) => {
                          const current = [...(rsvpForm.companionAllergiesOther || [])];
                          current[i] = e.target.value.slice(0, 200);
                          updateRsvpField("companionAllergiesOther", current);
                        }}
                        placeholder={t("rsvp.allergiesPlaceholder")}
                        disabled={isAlreadySubmitted}
                        style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}
                      />
                    </fieldset>

                    <label className="setup-label" htmlFor={`companion-birth-${i}`} style={{ marginTop: "0.5rem" }}>
                      {t("rsvp.birthDateLabel")} *
                    </label>
                    <input
                      id={`companion-birth-${i}`}
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      className="setup-input"
                      value={rsvpForm.companionBirthDates?.[i] || ""}
                      onChange={(e) => {
                        const current = [...(rsvpForm.companionBirthDates || [])];
                        current[i] = e.target.value;
                        updateRsvpField("companionBirthDates", current);
                      }}
                      style={{ colorScheme: "light" }}
                      required
                      disabled={isAlreadySubmitted}
                    />

                    {(() => {
                      const compAge = computeAge(rsvpForm.companionBirthDates?.[i] || "");
                      const isCompUnder14 = compAge !== null && compAge < 14;
                      const hasCompAllergies =
                        (rsvpForm.companionAllergies?.[i] || []).length > 0 ||
                        (rsvpForm.companionAllergiesOther?.[i] || "").trim().length > 0;
                      return (
                        <>
                          {isCompUnder14 ? (
                            <>
                              <p style={{ fontSize: "0.82rem", color: "#d97b18", margin: "0.3rem 0" }}>
                                {t("rsvp.ageUnder14Warning")}
                              </p>
                              <label
                                className="setup-checkbox-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  color: "var(--setup-title)",
                                  fontSize: "0.85rem",
                                  cursor: isAlreadySubmitted ? "default" : "pointer",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={rsvpForm.companionParentalConsents?.[i] || false}
                                  onChange={(e) => {
                                    const current = [...(rsvpForm.companionParentalConsents || [])];
                                    current[i] = e.target.checked;
                                    updateRsvpField("companionParentalConsents", current);
                                  }}
                                  style={{
                                    accentColor: "var(--setup-accent)",
                                    width: "1rem",
                                    height: "1rem",
                                    flexShrink: 0,
                                  }}
                                  required={isCompUnder14}
                                  disabled={isAlreadySubmitted}
                                />
                                <span>{t("rsvp.parentalConsent")}</span>
                              </label>
                            </>
                          ) : null}
                          {hasCompAllergies ? (
                            <label
                              className="setup-checkbox-label"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                color: "var(--setup-title)",
                                fontSize: "0.85rem",
                                cursor: isAlreadySubmitted ? "default" : "pointer",
                                marginBottom: "0.5rem",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={rsvpForm.companionHealthConsents?.[i] || false}
                                onChange={(e) => {
                                  const current = [...(rsvpForm.companionHealthConsents || [])];
                                  current[i] = e.target.checked;
                                  updateRsvpField("companionHealthConsents", current);
                                }}
                                style={{
                                  accentColor: "var(--setup-accent)",
                                  width: "1rem",
                                  height: "1rem",
                                  flexShrink: 0,
                                }}
                                required={hasCompAllergies}
                                disabled={isAlreadySubmitted}
                              />
                              <span>{t("rsvp.healthConsent")}</span>
                            </label>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            {isAttending && hasStructuredMenu && (
              <div className="setup-field" style={{ marginTop: "0.75rem" }}>
                <label className="setup-label" htmlFor="rsvpMenu">
                  {t("rsvp.menuLabel")} *
                </label>
                <select
                  id="rsvpMenu"
                  className="setup-input"
                  value={rsvpForm.menuSelection}
                  onChange={handleMenuChange}
                  required
                  disabled={isAlreadySubmitted}
                  aria-invalid={Boolean(rsvpMessage) || undefined}
                  aria-describedby={rsvpMessage ? "rsvpFeedback" : undefined}
                >
                  <option value="">{t("rsvp.menuPlaceholder")}</option>
                  {menuOptions.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {rsvpForm.menuSelection ? (
                  <div
                    style={{
                      marginTop: "0.35rem",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "0.5rem",
                      background: "color-mix(in srgb, var(--setup-accent) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--setup-accent) 15%, transparent)",
                      fontSize: "0.8rem",
                      lineHeight: 1.4,
                      color: "var(--setup-title, #fdf8ec)",
                    }}
                  >
                    {menuOptions.find((m) => m.key === rsvpForm.menuSelection)?.desc}
                  </div>
                ) : null}
              </div>
            )}

            {isAttending && !menuEnabled ? (
              <p className="setup-help" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                {t("rsvp.allergiesHint")}
              </p>
            ) : null}

            {isAttending && !hasStructuredMenu && menuTextoDishes ? (
              <div
                style={{
                  marginBottom: "0.5rem",
                  marginTop: "0.5rem",
                  padding: "0.6rem",
                  borderRadius: "0.6rem",
                  background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)",
                }}
              >
                <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                  {t("rsvp.menuLabel")}
                </p>
                <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>
                  {formatDishes(menuTextoDishes || "")}
                </p>
              </div>
            ) : null}

            {isAttending && menuEnabled ? (
              <p className="setup-help" style={{ fontSize: "0.8rem" }}>
                {t("rsvp.allergiesHint")}
              </p>
            ) : null}

            {isAttending && (
              <fieldset style={{ border: "none", padding: 0, margin: "0.5rem 0 0 0" }}>
                <legend className="setup-label" style={{ fontSize: "0.85rem" }}>
                  {t("rsvp.allergiesLegend")}
                </legend>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {ALLERGIES.map((a) => (
                    <label
                      key={a}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.85rem",
                        cursor: isDisabled ? "default" : "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(rsvpForm.allergies || []).includes(a)}
                        onChange={() => handleAllergyToggle(a)}
                        disabled={isAlreadySubmitted}
                      />
                      {t(`rsvp.allergies.${a}`, { defaultValue: a })}
                    </label>
                  ))}
                </div>
                <input
                  className="setup-input"
                  type="text"
                  value={rsvpForm.allergiesOther || ""}
                  onChange={(e) => updateRsvpField("allergiesOther", e.target.value.slice(0, 200))}
                  placeholder={t("rsvp.allergiesPlaceholder")}
                  disabled={isAlreadySubmitted}
                  style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}
                />
              </fieldset>
            )}

            <label className="setup-label" htmlFor="rsvpBirthDate" style={{ marginTop: "0.5rem" }}>
              {t("rsvp.birthDateLabel")} *
            </label>
            <input
              id="rsvpBirthDate"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className="setup-input"
              value={rsvpForm.birthDate}
              onChange={handleBirthDateChange}
              style={{ colorScheme: "light" }}
              required
              disabled={isAlreadySubmitted}
              aria-invalid={Boolean(rsvpMessage) || undefined}
              aria-describedby={rsvpMessage ? "rsvpFeedback" : undefined}
            />
            <p className="setup-help" style={{ marginTop: "0.2rem" }}>
              {t("rsvp.birthDateHint")}
            </p>

            {isUnder14 ? (
              <p style={{ fontSize: "0.82rem", color: "#d97b18", margin: "0.3rem 0" }}>{t("rsvp.ageUnder14Warning")}</p>
            ) : null}

            {isUnder14 ? (
              <label
                className="setup-checkbox-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--setup-title)",
                  fontSize: "0.85rem",
                  cursor: isAlreadySubmitted ? "default" : "pointer",
                  marginBottom: "0.5rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={rsvpForm.parentalConsent}
                  onChange={handleParentalConsentChange}
                  style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                  required={isUnder14}
                  disabled={isAlreadySubmitted}
                />
                <span>{t("rsvp.parentalConsent")}</span>
              </label>
            ) : null}

            <label
              className="setup-checkbox-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--setup-title)",
                fontSize: "0.85rem",
                cursor: isAlreadySubmitted ? "default" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={rsvpForm.privacyConsent}
                onChange={handlePrivacyConsentChange}
                style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                required
                disabled={isAlreadySubmitted}
              />
              <span>
                {t("rsvp.privacyConsentBefore")}
                {/* El enlace a la política NO puede anidarse dentro del label
                    (HTML inválido y activación implícita): se saca fuera como
                    span con rol de enlace operable por teclado. */}
                <span
                  role="link"
                  tabIndex={isAlreadySubmitted ? -1 : 0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLegalClick();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleLegalClick();
                    }
                  }}
                  style={{
                    color: "var(--setup-accent)",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    padding: 0,
                  }}
                >
                  {t("public.privacyPolicy")}
                </span>
                {t("rsvp.privacyConsentAfter")}
              </span>
            </label>

            {showHealthConsent ? (
              <label
                className="setup-checkbox-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--setup-title)",
                  fontSize: "0.85rem",
                  cursor: isAlreadySubmitted ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rsvpForm.healthConsent}
                  onChange={handleHealthConsentChange}
                  style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                  required={showHealthConsent}
                  disabled={isAlreadySubmitted}
                />
                <span>{t("rsvp.healthConsent")}</span>
              </label>
            ) : null}

            {isAlreadySubmitted ? (
              <div
                className="setup-actions"
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}
              >
                {isAdminTokenLoggedIn ? (
                  <button
                    className="setup-button"
                    type="button"
                    onClick={handleDeleteRsvp}
                    style={{ background: "#b91c1c", color: "#fff" }}
                  >
                    {t("rsvp.withdrawButton")}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="setup-actions">
                <button className="setup-button" type="submit" disabled={isDisabled}>
                  {isRsvpSubmitting
                    ? t("rsvp.submittingButton")
                    : isDisabled
                      ? t("rsvp.confirmedButton")
                      : t("rsvp.submitButton")}
                </button>
              </div>
            )}
          </form>

          {rsvpMessage ? (
            /* role="alert" para errores de validación: se anuncia de forma
               inmediata y prioritaria (el aria-live polite del éxito es menos
               intrusivo para confirmaciones). */
            <p className="rsvp-feedback" id="rsvpFeedback" role="alert">
              {rsvpMessage}
            </p>
          ) : null}

          {/* Error de red al cargar las respuestas: el invitado puede reintentar. */}
          {rsvpLoadError ? (
            <div className="rsvp-feedback rsvp-feedback--error" role="alert">
              <p style={{ margin: "0 0 0.5rem" }}>{t("rsvp.loadError")}</p>
              <button type="button" className="setup-button setup-button--compact" onClick={retryLoadRsvp}>
                {t("common.retry")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
});

export default RsvpSection;
