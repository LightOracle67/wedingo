import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useConfig, useAppUI, useAuth, useRsvpFormContext } from "../../contexts";
import { extractPlaceNameFromUrl } from "../../lib/geo-utils";
import { parseMenuDishes } from "../../lib/menu-utils";
import { MONTH_VALUE_TO_NUMBER } from "../../lib/constants";
import { parseTransportDepartures } from "../../lib/transport-utils";
import CornerDecorations from "../../components/CornerDecorations";

const ALLERGIES = ["sin gluten", "sin lactosa", "alergia frutos secos", "alergia mariscos"];

interface Departure {
  type?: "bus" | "taxi";
  time: string;
  url: string;
}

interface RsvpSectionProps {
  style?: React.CSSProperties;
  className?: string;
  rsvpMessage?: string;
  isRsvpSubmitting?: boolean;
  hasSubmitted?: boolean;
  alreadySubmittedEntry?: unknown;
  /** Error de red al cargar las respuestas (botón "Reintentar" del invitado). */
  rsvpLoadError?: boolean;
  retryLoadRsvp?: () => void;
  handleDeleteRsvp: () => void;
  menuEnabled?: boolean;
  menuCarneDishes?: string;
  menuPescadoDishes?: string;
  menuVeganoDishes?: string;
  menuTextoDishes?: string;
  transportEnabled?: string;
  transportDepartures?: string;
  cornerDecoration?: string;
  /** F3-7: número de confirmaciones "sí" actuales (para el control de aforo). */
  rsvpConfirmedCount?: number;
  /** Token de la invitación (para localizar la mesa asignada). */
  inviteToken?: string;
}

const RsvpSection = memo(function RsvpSection({
  style,
  className,
  rsvpMessage,
  isRsvpSubmitting,
  hasSubmitted,
  alreadySubmittedEntry,
  rsvpLoadError,
  retryLoadRsvp,
  handleDeleteRsvp,
  menuEnabled,
  menuCarneDishes,
  menuPescadoDishes,
  menuVeganoDishes,
  menuTextoDishes,
  transportEnabled,
  transportDepartures,
  cornerDecoration,
  rsvpConfirmedCount,
  inviteToken,
}: RsvpSectionProps) {
  const { t } = useTranslation();
  const { setLegalModal } = useAppUI();
  // El formulario (rsvpForm/updateRsvpField/submit) viene del contexto anidado
  // RsvpFormContext: solo esta sección lo consume, de modo que teclear en el
  // RSVP NO re-renderiza PublicInvitation ni el resto de secciones.
  const { rsvpForm, updateRsvpField, handleRsvpSubmit, computeAge } = useRsvpFormContext();
  // El botón "Retirar respuesta" solo funciona con sesión de admin (las reglas
  // Firestore exigen isSuperAdmin o hasActiveSession): para el invitado sin
  // sesión se oculta, ya que de otro modo se mostraría un botón que siempre
  // fallaría con permission-denied.
  const { isAdminTokenLoggedIn } = useAuth();
  const { config } = useConfig();

  // Mesa asignada al invitado (diferencial): se busca su nombre en las mesas
  // configuradas por el admin y se muestra tras confirmar.
  const [assignedTable, setAssignedTable] = useState<string>("");
  useEffect(() => {
    const attendingName = alreadySubmittedEntry && (alreadySubmittedEntry as Record<string, unknown>).attendance === "yes"
      ? String((alreadySubmittedEntry as Record<string, unknown>).guestName || "")
      : "";
    if (!attendingName || !inviteToken) {
      setAssignedTable("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        // Las mesas viven en Distribución: se busca en todas las secciones.
        const needle = attendingName.toLowerCase();
        const sectionsSnap = await getDocs(collection(db, "invitations", inviteToken, "sections"));
        let foundName = "";
        for (const section of sectionsSnap.docs) {
          const tablesSnap = await getDocs(
            collection(db, "invitations", inviteToken, "sections", section.id, "tables"),
          );
          const found = tablesSnap.docs.find((d) =>
            Array.isArray(d.data().guests) && (d.data().guests as string[]).some((g) => g.toLowerCase() === needle),
          );
          if (found) {
            foundName = String(found.data().name || "");
            break;
          }
        }
        if (!cancelled) setAssignedTable(foundName);
      } catch {
        if (!cancelled) setAssignedTable("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alreadySubmittedEntry, inviteToken]);

  // Fecha límite de confirmación: si la invitación tiene una y ya pasó, el
  // formulario se bloquea y se muestra el aviso.
  const deadlinePassed =
    (config?.rsvpDeadlineEnabled === "true" &&
      !!config.rsvpDeadline &&
      new Date(`${config.rsvpDeadline}T23:59:59`) < new Date()) ||
    // Modo simulación del superadmin (?sim=expired): fuerza el estado como si
    // hubiera pasado el plazo, sin tocar datos reales.
    new URLSearchParams(window.location.search).get("sim") === "expired";
  const isAlreadySubmitted =
    !!alreadySubmittedEntry ||
    // Simulación (?sim=responded): muestra el estado de "ya confirmado".
    new URLSearchParams(window.location.search).get("sim") === "responded";
  // F3-2: invitación bloqueada por el superadmin → el formulario se desactiva.
  const isBlocked = config?.status === "blocked";
  // Boda ya pasada (o expiración manual pasada): se bloquea la confirmación.
  const weddingPassed = (() => {
    if (config?.manualExpiry && `${config.manualExpiry}T23:59:59` < new Date().toISOString()) return true;
    if (!config?.weddingYear || !config?.weddingMonth) return false;
    const monthIndex = MONTH_VALUE_TO_NUMBER[config.weddingMonth] || 1;
    const d = new Date(Number(config.weddingYear), monthIndex - 1, Number(config.weddingDay) || 1);
    return d.getTime() > 0 && d.getTime() < Date.now();
  })();
  // F3-7: control de aforo — si hay capacidad y se ha alcanzado, se bloquea la
  // confirmación de asistencia (sí / con acompañantes).
  const capacity = Number(config?.rsvpCapacity) || 0;
  const capacityReached = capacity > 0 && (rsvpConfirmedCount ?? 0) >= capacity;
  const isDisabled = isRsvpSubmitting || hasSubmitted || isAlreadySubmitted || deadlinePassed || isBlocked || weddingPassed;
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
              <p style={{ color: "var(--setup-accent)", fontWeight: 600, fontSize: "0.95rem", margin: 0 }} role="status">
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
             {/* Versión de la política vigente (transparencia, GDPR 5.1/12). */}
             {config?.privacyPolicyVersion ? (
               <p className="setup-help" style={{ fontSize: "0.65rem", margin: "0.1rem 0 0" }}>
                 {t("rsvp.policyVersion", { version: config.privacyPolicyVersion })}
               </p>
             ) : null}

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

            {/* F3-8: firma digital extra (si el admin la exige). */}
            {config?.rsvpSignatureEnabled === "true" && !isAlreadySubmitted ? (
              <label
                className="setup-checkbox-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--setup-title)",
                  fontSize: "0.85rem",
                  cursor: isDisabled ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rsvpForm.digitalSignature}
                  onChange={(e) => updateRsvpField("digitalSignature", e.target.checked)}
                  style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                  disabled={isDisabled}
                />
                <span>{t("rsvp.digitalSignature")}</span>
              </label>
            ) : null}

            {/* Contacto opcional con consentimiento explícito (GDPR art. 7):
                SOLO se guarda si el invitado marca el consentimiento. */}
            {config?.rsvpContactEnabled === "true" && !isAlreadySubmitted ? (              <div style={{ borderTop: "1px solid var(--setup-border)", paddingTop: "0.75rem" }}>
                <p className="setup-label" style={{ fontSize: "0.85rem" }}>
                  {t("rsvp.contactOptional")}
                </p>
                <input
                  className="setup-input"
                  value={rsvpForm.phone}
                  onChange={(e) => updateRsvpField("phone", e.target.value.slice(0, 30))}
                  placeholder={t("rsvp.phonePlaceholder")}
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={isDisabled}
                  aria-label={t("rsvp.phonePlaceholder")}
                />
                <input
                  className="setup-input"
                  value={rsvpForm.email}
                  onChange={(e) => updateRsvpField("email", e.target.value.slice(0, 200))}
                  placeholder={t("rsvp.emailPlaceholder")}
                  type="email"
                  autoComplete="email"
                  disabled={isDisabled}
                  aria-label={t("rsvp.emailPlaceholder")}
                />
                <label
                  className="setup-checkbox-label"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--setup-subtitle)", cursor: isDisabled ? "default" : "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={rsvpForm.contactConsent}
                    onChange={(e) => updateRsvpField("contactConsent", e.target.checked)}
                    style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                    disabled={isDisabled}
                  />
                  <span>{t("rsvp.contactConsentLabel")}</span>
                </label>
              </div>
            ) : null}

            {/* Publicar nombre en la lista de confirmados (prueba social):
                opt-in explícito. Solo se publica si el invitado asiste Y marca
                este consentimiento (y la pareja activa el toggle en Extras). */}
            {!isAlreadySubmitted && (config?.showConfirmedPeople === "true") ? (
              <label
                className="setup-checkbox-label"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--setup-subtitle)", cursor: isDisabled ? "default" : "pointer", borderTop: "1px solid var(--setup-border)", paddingTop: "0.75rem" }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(rsvpForm.showNameInConfirmed)}
                  onChange={(e) => updateRsvpField("showNameInConfirmed", e.target.checked)}
                  style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                  disabled={isDisabled}
                />
                <span>{t("rsvp.showNameInConfirmedLabel")}</span>
              </label>
            ) : null}

            {isBlocked ? (
              <p className="setup-error" role="alert">
                {t("rsvp.blockedNotice")}
              </p>
            ) : weddingPassed ? (
              <p className="setup-error" role="alert">
                {t("rsvp.weddingPassedNotice")}
              </p>
            ) : capacityReached && rsvpForm.attendance !== "no" ? (
              <p className="setup-error" role="alert">
                {t("rsvp.capacityReached")}
              </p>
            ) : null}

            {/* Aforo restante + días para confirmar (sin datos personales). */}
            {!isAlreadySubmitted && !isBlocked && !weddingPassed ? (
              <div className="admin-flex" style={{ gap: "0.75rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                {capacity > 0 ? (
                  <p className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
                    {t("rsvp.capacityLeft", { count: Math.max(0, capacity - (rsvpConfirmedCount ?? 0)) })}
                  </p>
                ) : null}
                {config?.rsvpDeadline ? (
                  <p className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
                    {t("rsvp.daysLeft", { days: Math.max(0, Math.ceil((new Date(`${config.rsvpDeadline}T23:59:59`).getTime() - Date.now()) / 86400000)) })}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Resumen de la respuesta tras enviar (el invitado ve lo elegido). */}
            {hasSubmitted && !isAlreadySubmitted ? (
              <div className="rsvp-summary" style={{ marginTop: "0.6rem", fontSize: "0.85rem", lineHeight: 1.7 }}>
                <p className="setup-label" style={{ fontSize: "0.8rem" }}>{t("rsvp.summaryTitle")}</p>
                <p style={{ margin: 0 }}>{t("rsvp.summaryAttendance", { v: rsvpForm.attendance === "no" ? t("rsvp.notAttending") : t("rsvp.attendingAlone") })}</p>
                {rsvpForm.menuSelection ? <p style={{ margin: 0 }}>{t("rsvp.summaryMenu", { m: rsvpForm.menuSelection })}</p> : null}
                {rsvpForm.companionCount > 0 ? <p style={{ margin: 0 }}>{t("rsvp.summaryCompanions", { c: rsvpForm.companionCount })}</p> : null}
              </div>
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

          {/* Mensaje de agradecimiento configurado por el admin: se muestra
              tras confirmar (F1-9). */}
          {hasSubmitted && config?.rsvpThanks ? (
            <p className="rsvp-feedback rsvp-feedback--thanks" style={{ marginTop: "0.5rem" }}>
              {config.rsvpThanks}
            </p>
          ) : null}
          {assignedTable ? (
            <p className="rsvp-feedback" style={{ marginTop: "0.5rem", textAlign: "center" }}>
              {t("rsvp.yourTable", { table: assignedTable })}
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
