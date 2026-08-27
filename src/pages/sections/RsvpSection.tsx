import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useConfig, useAppUI, useAuth, useRsvpFormContext } from "../../contexts";
import CornerDecorations from "../../components/CornerDecorations";
import {
  deriveRsvpState,
  buildMenuOptions,
  buildModeOptions,
  buildDepartures,
  formatDishesText,
  type RsvpConfigLike,
} from "./rsvp/derive";
import { extractPlaceNameFromUrl } from "../../lib/geo-utils";
import AttendanceSelector from "./rsvp/AttendanceSelector";
import TransportPicker from "./rsvp/TransportPicker";
import { MenuPicker, AllergiesChips } from "./rsvp/MenuAndAllergies";
import CompanionCard from "./rsvp/CompanionCard";
import ConsentsBlock from "./rsvp/ConsentsBlock";
import { MAX_CHILDREN, MAX_COMPANIONS } from "./rsvp/constants";
import type { RsvpFormData } from "../../hooks/useRsvp";

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
  /** Número de confirmaciones "sí" actuales (para el control de aforo). */
  rsvpConfirmedCount?: number;
  /** Token de la invitación (para localizar la mesa asignada). */
  inviteToken?: string;
}

/** Claves conocidas del borrador autoguardado (espejo tipado de RsvpFormData). */
const DRAFT_KEYS: Array<{
  key: keyof RsvpFormData;
  kind: "string" | "number" | "boolean" | "stringArray" | "boolArray" | "matrix";
}> = [
  { key: "guestName", kind: "string" },
  { key: "attendance", kind: "string" },
  { key: "companionCount", kind: "number" },
  { key: "companionNames", kind: "stringArray" },
  { key: "companionMenus", kind: "stringArray" },
  { key: "companionAllergies", kind: "matrix" },
  { key: "companionAllergiesOther", kind: "stringArray" },
  { key: "childrenCount", kind: "string" },
  { key: "childrenAllergies", kind: "stringArray" },
  { key: "childrenAllergiesOther", kind: "string" },
  { key: "companionTransportModes", kind: "stringArray" },
  { key: "companionTransportChoices", kind: "stringArray" },
  { key: "menuSelection", kind: "string" },
  { key: "allergies", kind: "stringArray" },
  { key: "allergiesOther", kind: "string" },
  { key: "privacyConsent", kind: "boolean" },
  { key: "healthConsent", kind: "boolean" },
  { key: "transportChoice", kind: "string" },
  { key: "transportMode", kind: "string" },
  { key: "transportTime", kind: "string" },
  { key: "transportPlace", kind: "string" },
  { key: "digitalSignature", kind: "boolean" },
  { key: "phone", kind: "string" },
  { key: "email", kind: "string" },
];

/** ¿Prefiere el usuario movimiento reducido? (los scrolls pasan a 'auto'). */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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
  // El formulario vive en el contexto anidado RsvpFormContext: teclear aquí NO
  // re-renderiza PublicInvitation ni el resto de secciones.
  const { rsvpForm, updateRsvpField, handleRsvpSubmit, setRsvpForm } = useRsvpFormContext();
  // El botón "Retirar respuesta" solo funciona con sesión de admin (las reglas
  // Firestore lo exigen); para el invitado se oculta.
  const { isAdminTokenLoggedIn } = useAuth();
  const { config } = useConfig();

  // Mesa asignada al invitado: se busca su nombre entre las mesas configuradas.
  const [assignedTable, setAssignedTable] = useState<string>("");
  useEffect(() => {
    const attendingName =
      alreadySubmittedEntry && (alreadySubmittedEntry as Record<string, unknown>).attendance === "yes"
        ? String((alreadySubmittedEntry as Record<string, unknown>).guestName || "")
        : "";
    if (!attendingName || !inviteToken) {
      setAssignedTable("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const needle = attendingName.toLowerCase();
        const sectionsSnap = await getDocs(collection(db, "invitations", inviteToken, "sections"));
        let foundName = "";
        for (const section of sectionsSnap.docs) {
          const tablesSnap = await getDocs(
            collection(db, "invitations", inviteToken, "sections", section.id, "tables"),
          );
          const found = tablesSnap.docs.find(
            (d) =>
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

  // Estados derivados puros (bloqueos, aforo, transporte disponible…).
  const derived = useMemo(
    () =>
      deriveRsvpState({
        config: config as unknown as RsvpConfigLike | undefined,
        alreadySubmittedEntry,
        isRsvpSubmitting,
        hasSubmitted,
        rsvpConfirmedCount,
      }),
    [config, alreadySubmittedEntry, isRsvpSubmitting, hasSubmitted, rsvpConfirmedCount],
  );

  // Asistencia efectiva (con acompañantes / solo / no).
  const isAttending = rsvpForm.attendance !== "no";

  const menuOptions = useMemo(
    () =>
      buildMenuOptions(
        {
          menuCarneDishes: menuCarneDishes ?? "",
          menuPescadoDishes: menuPescadoDishes ?? "",
          menuVeganoDishes: menuVeganoDishes ?? "",
        },
        t,
      ),
    [menuCarneDishes, menuPescadoDishes, menuVeganoDishes, t],
  );
  const modeOptions = useMemo(
    () => buildModeOptions({ transportEnabled: transportEnabled ?? "" }, t),
    [transportEnabled, t],
  );
  // Las salidas de transporte también son prop; transportEnabled 'none' las oculta.
  const departures = useMemo(() => {
    if (!transportEnabled || transportEnabled === "none") return [];
    return buildDepartures({ transportEnabled: transportEnabled, transportDepartures: transportDepartures ?? "" });
  }, [transportEnabled, transportDepartures]);

  // Cambio de modo de transporte (titular o acompañante): rellena salida/hora/lugar.
  const handleTransportModeChange = useCallback(
    (group: "main" | "companion", idx: number, mode: string) => {
      const modeField = group === "main" ? "transportMode" : `companionTransportModes[${idx}]`;
      const choiceField = group === "main" ? "transportChoice" : `companionTransportChoices[${idx}]`;
      updateRsvpField(modeField, mode);
      const first = departures.findIndex((d) => (d.type || "bus") === mode);
      const dep = first >= 0 ? departures[first] : undefined;
      updateRsvpField(choiceField, first >= 0 ? String(first) : "");
      if (group === "main") {
        updateRsvpField("transportTime", dep?.time || "");
        updateRsvpField("transportPlace", dep?.url ? extractPlaceNameFromUrl(dep.url) : "");
      }
    },
    [departures, updateRsvpField],
  );

  // Cambio de salida concreta: arrastra hora y lugar de esa salida.
  const handleDepartureChange = useCallback(
    (group: "main" | "companion", idx: number, value: string) => {
      const choiceField = group === "main" ? "transportChoice" : `companionTransportChoices[${idx}]`;
      updateRsvpField(choiceField, value);
      if (group === "main") {
        const depIdx = Number.parseInt(value, 10);
        const dep = Number.isFinite(depIdx) ? departures[depIdx] : undefined;
        updateRsvpField("transportTime", dep?.time || "");
        updateRsvpField("transportPlace", dep?.url ? extractPlaceNameFromUrl(dep.url) : "");
      }
    },
    [departures, updateRsvpField],
  );

  // Elimina el acompañante i recortando TODOS los arrays paralelos.
  const removeCompanionAt = useCallback(
    (index: number) => {
      setRsvpForm((prev) => ({
        ...prev,
        companionNames: prev.companionNames.filter((_, idx) => idx !== index),
        companionMenus: prev.companionMenus.filter((_, idx) => idx !== index),
        companionAllergies: prev.companionAllergies.filter((_, idx) => idx !== index),
        companionTransportChoices: prev.companionTransportChoices.filter((_, idx) => idx !== index),
        companionTransportModes: prev.companionTransportModes.filter((_, idx) => idx !== index),
        companionCount: Math.max(0, prev.companionCount - 1),
      }));
    },
    [setRsvpForm],
  );

  // ---- Borrador autoguardado (sessionStorage) ----
  const draftKey = inviteToken ? `wedin_rsvp_draft_${inviteToken}` : null;
  const restoredRef = useRef(false);

  // Restauración única al montar/cambiar de invitación: solo claves conocidas
  // y tipos válidos; un JSON corrupto se ignora sin romper nada.
  useEffect(() => {
    restoredRef.current = false;
    if (!draftKey) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setRsvpForm((prev) => {
        const next: RsvpFormData = { ...prev };
        for (const { key, kind } of DRAFT_KEYS) {
          const v = parsed[key];
          if (v === undefined || v === null) continue;
          if (kind === "string" && typeof v === "string") next[key] = v as never;
          else if (kind === "number" && typeof v === "number") next[key] = v as never;
          else if (kind === "boolean" && typeof v === "boolean") next[key] = v as never;
          else if (kind === "stringArray" && Array.isArray(v) && v.every((x) => typeof x === "string"))
            next[key] = v as never;
          else if (kind === "boolArray" && Array.isArray(v) && v.every((x) => typeof x === "boolean"))
            next[key] = v as never;
          else if (
            kind === "matrix" &&
            Array.isArray(v) &&
            v.every((row) => Array.isArray(row) && row.every((x) => typeof x === "string"))
          )
            next[key] = v as never;
        }
        return next;
      });
    } catch {
      // Borrador corrupto: se descarta en silencio.
    } finally {
      restoredRef.current = true;
    }
  }, [draftKey, setRsvpForm]);

  // Guardado continuo mientras el invitado rellena (no tras enviar ni congelado).
  useEffect(() => {
    if (!draftKey || hasSubmitted || derived.isAlreadySubmitted) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(rsvpForm));
    } catch {
      // Cuota llena o storage bloqueado: el flujo sigue funcionando igual.
    }
  }, [rsvpForm, draftKey, hasSubmitted, derived.isAlreadySubmitted]);

  // Al enviar con éxito el borrador deja de tener sentido.
  useEffect(() => {
    if (hasSubmitted && draftKey) {
      try {
        sessionStorage.removeItem(draftKey);
      } catch {}
    }
  }, [hasSubmitted, draftKey]);

  // Scroll al resumen tras enviar (respetando reduced-motion).
  const summaryRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (hasSubmitted)
      summaryRef.current?.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  }, [hasSubmitted]);

  // Foco en el mensaje de error (no roba foco en el éxito).
  const feedbackRef = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    if (rsvpMessage && !hasSubmitted) feedbackRef.current?.focus();
  }, [rsvpMessage, hasSubmitted]);

  const frozen = derived.fieldsFrozen;

  // Los niños se declaran con un contador y cuentan para el aforo (decisión de
  // negocio): las plazas restantes restan también los niños del formulario.
  const childrenCount = Number(rsvpForm.childrenCount || "0");
  const capacityWithChildren = Math.max(
    0,
    derived.capacity > 0 ? derived.capacity - (rsvpConfirmedCount ?? 0) - childrenCount : 0,
  );
  const capacityReachedWithChildren =
    derived.capacity > 0 && (rsvpConfirmedCount ?? 0) + childrenCount >= derived.capacity;

  return (
    <section
      id="rsvp"
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

          {/* Banner: ya respondió (variante acompañante muestra a quién acompaña) */}
          {derived.isAlreadySubmitted &&
          (alreadySubmittedEntry as Record<string, unknown>)?.rsvpType === "companion" ? (
            <div className="rv2-banner">
              <p style={{ margin: 0 }}>
                {t("rsvp.companionInfo", {
                  name: (alreadySubmittedEntry as Record<string, unknown>)?.mainGuestName || "",
                })}
              </p>
            </div>
          ) : derived.isAlreadySubmitted ? (
            <div className="rv2-banner">
              <p style={{ margin: 0 }} role="status">
                {t("rsvp.alreadySubmitted")}
              </p>
            </div>
          ) : null}

          <form className="rv2-form" onSubmit={handleRsvpSubmit} noValidate aria-busy={isRsvpSubmitting}>
            {derived.deadlinePassed ? (
              <p className="rsvp-deadline-passed" role="alert">
                {t("rsvp.deadlinePassed")}
              </p>
            ) : null}

            {/* Nombre del titular */}
            <label className="setup-label rv2-toplabel" htmlFor="rsvpName">
              {t("rsvp.nameLabel")} *
            </label>
            <input
              id="rsvpName"
              className="setup-input"
              value={rsvpForm.guestName}
              onChange={(e) => updateRsvpField("guestName", e.target.value.slice(0, 120))}
              placeholder={t("rsvp.namePlaceholder")}
              autoComplete="off"
              required
              maxLength={120}
              disabled={frozen}
              aria-invalid={Boolean(rsvpMessage) || undefined}
              aria-describedby={rsvpMessage ? "rsvpFeedback" : undefined}
            />
            <p className="setup-help" style={{ marginTop: "0.2rem" }}>
              {t("rsvp.nameHint")}
            </p>

            {/* Alergias del titular: junto al nombre para que se declaren
                antes de elegir asistencia/menú */}
            {isAttending ? (
              <AllergiesChips
                selected={rsvpForm.allergies || []}
                other={rsvpForm.allergiesOther || ""}
                onToggle={(a) => {
                  const current = rsvpForm.allergies || [];
                  const updated = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
                  updateRsvpField("allergies", updated);
                }}
                onOtherChange={(v) => updateRsvpField("allergiesOther", v)}
                frozen={frozen}
                t={t}
              />
            ) : null}

            {/* Asistencia: segmented control grande */}
            <AttendanceSelector
              value={rsvpForm.attendance}
              onChange={(v) => updateRsvpField("attendance", v)}
              frozen={frozen}
              t={t}
            />

            {/* Añadir acompañante */}
            {rsvpForm.attendance === "with" && !frozen && (rsvpForm.companionCount || 0) < MAX_COMPANIONS ? (
              <button
                type="button"
                className="rv2-add"
                onClick={() => updateRsvpField("companionCount", (rsvpForm.companionCount || 0) + 1)}
              >
                + {t("rsvp.addCompanion")}
              </button>
            ) : null}

            {/* Transporte del titular */}
            {isAttending && departures.length > 0 ? (
              <TransportPicker
                group="main"
                mode={rsvpForm.transportMode || "own"}
                choice={rsvpForm.transportChoice || ""}
                modes={modeOptions}
                departures={departures}
                onModeChange={(m) => handleTransportModeChange("main", 0, m)}
                onDepartureChange={(c) => handleDepartureChange("main", 0, c)}
                frozen={frozen}
                t={t}
              />
            ) : null}

            {/* Acompañantes */}
            {rsvpForm.attendance === "with" && rsvpForm.companionCount > 0 ? (
              <div className="rv2-cards">
                {Array.from({ length: rsvpForm.companionCount }, (_, i) => (
                  <CompanionCard
                    key={i}
                    index={i}
                    form={rsvpForm}
                    onField={updateRsvpField}
                    onRemove={removeCompanionAt}
                    onModeChange={(idx, m) => handleTransportModeChange("companion", idx, m)}
                    onDepartureChange={(idx, c) => handleDepartureChange("companion", idx, c)}
                    modes={modeOptions}
                    departures={departures}
                    menuOptions={menuOptions}
                    hasTransportChoices={departures.length > 0}
                    hasStructuredMenu={Boolean(menuEnabled && menuOptions.length > 0)}
                    frozen={frozen}
                    t={t}
                  />
                ))}
              </div>
            ) : null}

            {/* Resumen de plazas que va a reservar */}
            {isAttending && rsvpForm.attendance === "with" && rsvpForm.companionCount > 0 ? (
              <p className="setup-help" role="status" style={{ margin: "0.4rem 0 0", fontSize: "0.8rem" }}>
                {t("rsvp.confirmCount", { count: (rsvpForm.companionCount || 0) + 1 })}
              </p>
            ) : null}

            {/* Niños acompañantes: pregunta + contador + alergias del grupo */}
            {isAttending ? (
              <div className="rv2-children" style={{ marginTop: "0.5rem" }}>
                <label className="rv2-check" style={{ marginBottom: "0.1rem" }}>
                  <input
                    type="checkbox"
                    checked={childrenCount > 0}
                    onChange={(e) => updateRsvpField("childrenCount", e.target.checked ? "1" : "0")}
                    disabled={frozen}
                  />
                  <span>{t("rsvp.childrenQuestion")}</span>
                </label>
                {childrenCount > 0 ? (
                  <>
                    <label
                      className="setup-label"
                      htmlFor="rsvpChildrenCount"
                      style={{ display: "block", marginBottom: "0.2rem" }}
                    >
                      {t("rsvp.childrenCountLabel")}
                    </label>
                    <input
                      id="rsvpChildrenCount"
                      className="setup-input"
                      type="number"
                      min={0}
                      max={MAX_CHILDREN}
                      inputMode="numeric"
                      value={rsvpForm.childrenCount}
                      onChange={(e) => updateRsvpField("childrenCount", e.target.value)}
                      required
                      disabled={frozen}
                    />
                    <p className="setup-help" style={{ marginTop: "0.2rem" }}>
                      {t("rsvp.childrenMaxHint", { count: MAX_CHILDREN })}
                    </p>
                    <AllergiesChips
                      selected={rsvpForm.childrenAllergies || []}
                      other={rsvpForm.childrenAllergiesOther || ""}
                      onToggle={(a) => {
                        const current = rsvpForm.childrenAllergies || [];
                        const updated = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
                        updateRsvpField("childrenAllergies", updated);
                      }}
                      onOtherChange={(v) => updateRsvpField("childrenAllergiesOther", v)}
                      idSuffix="-children"
                      frozen={frozen}
                      t={t}
                    />
                  </>
                ) : null}
              </div>
            ) : null}

            {/* Menú del titular */}
            {isAttending && menuEnabled && menuOptions.length > 0 ? (
              <MenuPicker
                name="rv2MenuMain"
                value={rsvpForm.menuSelection}
                options={menuOptions}
                onChange={(k) => updateRsvpField("menuSelection", k)}
                frozen={frozen}
                t={t}
              />
            ) : null}
            {isAttending && !menuEnabled ? (
              <p className="setup-help" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                {t("rsvp.allergiesHint")}
              </p>
            ) : null}
            {isAttending && !(menuEnabled && menuOptions.length > 0) && menuTextoDishes ? (
              <div className="rv2-menutext">
                <p className="story-eyebrow" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                  {t("rsvp.menuLabel")}
                </p>
                <pre className="story-note whitespace-pre-line" style={{ font: "inherit", whiteSpace: "pre-line" }}>
                  {(menuTextoDishes && formatDishesText(menuTextoDishes, t)) || ""}
                </pre>
              </div>
            ) : null}
            {isAttending && menuEnabled ? (
              <p className="setup-help" style={{ fontSize: "0.8rem" }}>
                {t("rsvp.allergiesHint")}
              </p>
            ) : null}

            {/* Consentimientos y opcionales */}
            <ConsentsBlock
              form={rsvpForm}
              onField={updateRsvpField}
              showHealthConsent={
                isAttending &&
                ((rsvpForm.allergies || []).length > 0 ||
                  (rsvpForm.allergiesOther || "").trim().length > 0 ||
                  (rsvpForm.childrenAllergies || []).length > 0 ||
                  (rsvpForm.childrenAllergiesOther || "").trim().length > 0 ||
                  (rsvpForm.companionAllergies || []).some(
                    (a, idx) =>
                      (a || []).length > 0 ||
                      ((rsvpForm.companionAllergiesOther || [])[idx] || "").trim().length > 0,
                  ))
              }
              signatureEnabled={config?.rsvpSignatureEnabled === "true"}
              policyVersion={typeof config?.privacyPolicyVersion === "string" ? config.privacyPolicyVersion : undefined}
              frozen={frozen}
              disabled={derived.isDisabled}
              onOpenPrivacy={() => setLegalModal("privacy")}
              t={t}
            />

            {/* Avisos de estado */}
            {derived.isBlocked ? (
              <p className="setup-error" role="alert">
                {t("rsvp.blockedNotice")}
              </p>
            ) : derived.weddingPassed ? (
              <p className="setup-error" role="alert">
                {t("rsvp.weddingPassedNotice")}
              </p>
            ) : capacityReachedWithChildren && rsvpForm.attendance !== "no" ? (
              <p className="setup-error" role="alert">
                {t("rsvp.capacityReached")}
              </p>
            ) : null}

            {/* Aforo restante + días para confirmar */}
            {!derived.isAlreadySubmitted && !derived.isBlocked && !derived.weddingPassed ? (
              <div className="admin-flex" style={{ gap: "0.75rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                {derived.capacity > 0 ? (
                  <p className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
                    {t("rsvp.capacityLeft", { count: capacityWithChildren })}
                  </p>
                ) : null}
                {config?.rsvpDeadlineEnabled === "true" && config?.rsvpDeadline ? (
                  <p className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
                    {t("rsvp.daysLeft", {
                      days: Math.max(
                        0,
                        Math.ceil((new Date(`${config.rsvpDeadline}T23:59:59`).getTime() - Date.now()) / 86400000),
                      ),
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Resumen post-envío */}
            {hasSubmitted && !derived.isAlreadySubmitted ? (
              <div
                ref={summaryRef}
                className="rsvp-summary"
                style={{ marginTop: "0.6rem", fontSize: "0.85rem", lineHeight: 1.7 }}
              >
                <p className="setup-label" style={{ fontSize: "0.8rem" }}>
                  {t("rsvp.summaryTitle")}
                </p>
                <p style={{ margin: 0 }}>
                  {t("rsvp.summaryAttendance", {
                    v:
                      rsvpForm.attendance === "no"
                        ? t("rsvp.notAttending")
                        : rsvpForm.attendance === "with"
                          ? t("rsvp.attendingWithCompanions")
                          : t("rsvp.attendingAlone"),
                  })}
                </p>
                {rsvpForm.menuSelection ? (
                  <p style={{ margin: 0 }}>
                    {t("rsvp.summaryMenu", {
                      m: menuOptions.find((o) => o.key === rsvpForm.menuSelection)?.label || rsvpForm.menuSelection,
                    })}
                  </p>
                ) : null}
                {rsvpForm.companionCount > 0 ? (
                  <p style={{ margin: 0 }}>{t("rsvp.summaryCompanions", { c: rsvpForm.companionCount })}</p>
                ) : null}
              </div>
            ) : null}

            {/* Acciones: retirar (admin) o enviar */}
            {derived.isAlreadySubmitted ? (
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
              <div className="setup-actions rv2-actions">
                <button
                  className="setup-button rv2-submit"
                  type="submit"
                  disabled={derived.isDisabled || capacityReachedWithChildren}
                >
                  {isRsvpSubmitting
                    ? t("rsvp.submittingButton")
                    : derived.isDisabled
                      ? t("rsvp.confirmedButton")
                      : t("rsvp.submitButton")}
                </button>
              </div>
            )}
          </form>

          {/* Feedback de validación/error */}
          {rsvpMessage ? (
            <p className="rsvp-feedback" id="rsvpFeedback" role="alert" tabIndex={-1} ref={feedbackRef}>
              {rsvpMessage}
            </p>
          ) : null}

          {/* Agradecimiento configurable */}
          {hasSubmitted && config?.rsvpThanks ? (
            <p
              className="rsvp-feedback rsvp-feedback--thanks"
              style={{ marginTop: "0.5rem" }}
              role="status"
              aria-live="polite"
            >
              {config.rsvpThanks}
            </p>
          ) : null}

          {assignedTable ? (
            <p className="rsvp-feedback" style={{ marginTop: "0.5rem", textAlign: "center" }}>
              {t("rsvp.yourTable", { table: assignedTable })}
            </p>
          ) : null}

          {/* Error de carga con reintento */}
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
