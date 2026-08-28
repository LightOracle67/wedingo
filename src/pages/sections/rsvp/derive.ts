import { extractPlaceNameFromUrl } from "../../../lib/geo-utils";
import { parseMenuDishes } from "../../../lib/menu-utils";
import { MONTH_VALUE_TO_NUMBER } from "../../../lib/constants";
import { parseTransportDepartures } from "../../../lib/transport-utils";

import type { TFunction } from "i18next";

/** Traductor real de react-i18next (evita rocesos de tipos con overloads). */
export type Translate = TFunction<"translation", undefined>;

/** Configuración de la invitación que afecta al RSVP (subset tipado de config). */
export interface RsvpConfigLike {
  rsvpDeadlineEnabled?: string;
  rsvpDeadline?: string;
  status?: string;
  manualExpiry?: string;
  weddingYear?: string;
  weddingMonth?: string;
  weddingDay?: string;
  menuCarneDishes?: string;
  menuPescadoDishes?: string;
  menuVeganoDishes?: string;
  transportEnabled?: string;
  transportDepartures?: string;
  privacyPolicyVersion?: string;
  rsvpSignatureEnabled?: string;
  rsvpContactEnabled?: string;
  rsvpThanks?: string;
}

export interface Departure {
  type?: "bus" | "taxi";
  time: string;
  url: string;
}

/** Estados de bloqueo y derivados que gobiernan la UI del formulario. */
interface DerivedState {
  deadlinePassed: boolean;
  isAlreadySubmitted: boolean;
  isBlocked: boolean;
  weddingPassed: boolean;
  /** El formulario completo queda inerte (enviando, ya enviado, bloqueado…). */
  isDisabled: boolean;
  /** Campos editables concretos congelados aunque el envío pudiera proceder. */
  fieldsFrozen: boolean;
  hasStructuredMenu: boolean;
}

/** Opciones de menú estructurado listas para pintar (clave + etiqueta + platos). */
export function buildMenuOptions(config: RsvpConfigLike, t: Translate) {
  const format = (json: string) => {
    const dishes = parseMenuDishes(json);
    // Etiqueta del orden del plato + su texto, una línea por plato.
    return dishes
      .map((d) => `${t("setup.menuOrder" + d.order.charAt(0).toUpperCase() + d.order.slice(1))}: ${d.text}`)
      .join("\n");
  };

  return [
    ...(config.menuCarneDishes
      ? [{ key: "carne" as const, label: t("rsvp.menuCarne"), desc: format(config.menuCarneDishes) }]
      : []),
    ...(config.menuPescadoDishes
      ? [{ key: "pescado" as const, label: t("rsvp.menuPescado"), desc: format(config.menuPescadoDishes) }]
      : []),
    ...(config.menuVeganoDishes
      ? [{ key: "vegano" as const, label: t("rsvp.menuVegano"), desc: format(config.menuVeganoDishes) }]
      : []),
  ];
}

/** Parsea las salidas de transporte configuradas por la pareja. */
export function buildDepartures(config: RsvpConfigLike): Departure[] {
  if (!config.transportEnabled || config.transportEnabled === "none") return [];
  return parseTransportDepartures(config.transportDepartures);
}

/** Modos de transporte ofrecidos según la configuración (both|bus|taxi), ya traducidos. */
export function buildModeOptions(config: RsvpConfigLike, t: Translate) {
  const opts: { value: string; labelKey: string }[] = [{ value: "own", labelKey: "rsvp.transportOwnCarOption" }];
  if (config.transportEnabled === "both" || config.transportEnabled === "bus") {
    opts.push({ value: "bus", labelKey: "rsvp.transportBusOption" });
  }
  if (config.transportEnabled === "both" || config.transportEnabled === "taxi") {
    opts.push({ value: "taxi", labelKey: "rsvp.transportTaxiOption" });
  }
  return opts.map((o) => ({ ...o, label: t(o.labelKey) }));
}

/** Etiqueta legible de una salida ("Lugar (hh:mm)" con fallbacks). */
export function departureLabel(dep: Departure, t: Translate): string {
  const typeLabel = t(dep.type === "taxi" ? "transport.typeTaxi" : "transport.typeBus");
  const placeName = dep.url ? extractPlaceNameFromUrl(dep.url) : "";
  if (placeName && dep.time) return `${placeName} (${dep.time})`;
  if (placeName) return placeName;
  return dep.time ? `${dep.time} (${typeLabel})` : typeLabel;
}

/**
 * Deriva todos los estados que gobiernan la UI. Función pura (salvo Date.now)
 * para poder testearla sin montar React.
 */
export function deriveRsvpState(params: {
  config: RsvpConfigLike | undefined;
  alreadySubmittedEntry?: unknown;
  isRsvpSubmitting?: boolean | undefined;
  hasSubmitted?: boolean | undefined;

}): DerivedState {
  const { config, alreadySubmittedEntry, isRsvpSubmitting, hasSubmitted } = params;

  // Fecha límite pasada (o simulación ?sim=expired del superadmin).
  const deadlinePassed =
    (config?.rsvpDeadlineEnabled === "true" &&
      !!config.rsvpDeadline &&
      new Date(`${config.rsvpDeadline}T23:59:59`) < new Date()) ||
    new URLSearchParams(window.location.search).get("sim") === "expired";

  // Ya respondió (o simulación ?sim=responded).
  const isAlreadySubmitted =
    !!alreadySubmittedEntry || new URLSearchParams(window.location.search).get("sim") === "responded";

  const isBlocked = config?.status === "blocked";

  // Boda pasada según fecha configurada o expiración manual.
  const weddingPassed = (() => {
    if (config?.manualExpiry && `${config.manualExpiry}T23:59:59` < new Date().toISOString()) return true;
    if (!config?.weddingYear || !config?.weddingMonth) return false;
    const monthIndex = MONTH_VALUE_TO_NUMBER[config.weddingMonth] || 1;
    const d = new Date(Number(config.weddingYear), monthIndex - 1, Number(config.weddingDay) || 1);
    return d.getTime() > 0 && d.getTime() < Date.now();
  })();

  const isDisabled =
    Boolean(isRsvpSubmitting) ||
    Boolean(hasSubmitted) ||
    isAlreadySubmitted ||
    deadlinePassed ||
    isBlocked ||
    weddingPassed;

  return {
    deadlinePassed,
    isAlreadySubmitted,
    isBlocked,
    weddingPassed,
    isDisabled,
    fieldsFrozen: isAlreadySubmitted || deadlinePassed || isBlocked || weddingPassed,
    hasStructuredMenu: Boolean(config?.menuCarneDishes || config?.menuPescadoDishes || config?.menuVeganoDishes),
  };
}

/** Formatea un JSON de platos ("menuTextoDishes") como texto legible. */
export function formatDishesText(json: string, t: Translate): string {
  return parseMenuDishes(json)
    .map((d) => `${t("setup.menuOrder" + d.order.charAt(0).toUpperCase() + d.order.slice(1))}: ${d.text}`)
    .join("\n");
}
