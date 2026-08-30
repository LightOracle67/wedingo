import { useCallback, useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

/** Valores por defecto de los ajustes globales de la plataforma. */
export interface PlatformSettings {
  maintenance: string;
  bannerEnabled: string;
  bannerText: string;
  blockedUrls: string;
  blockedTokens: string;
  expiringDays: string;
  /** Funciones sociales desactivadas GLOBALMENTE (lista separada por comas):
   *  gifts, trivia. Kill-switch por función. */
  disabledFeatures: string;
}

const DEFAULTS: PlatformSettings = {
  maintenance: "false",
  bannerEnabled: "false",
  bannerText: "",
  blockedUrls: "",
  blockedTokens: "",
  expiringDays: "30",
  disabledFeatures: "",
};

/** Comprueba si una función social está desactivada globalmente. */
export function isFeatureDisabled(settings: PlatformSettings, feature: string): boolean {
  return (settings.disabledFeatures || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(feature.toLowerCase());
}

const SETTINGS_REF = () => doc(db, "platform", "settings");

/**
 * Carga los ajustes globales de la plataforma (Fase 3): banner, modo
 * mantenimiento, listas bloqueadas y umbral de expiración. Solo hay UN doc
 * (`platform/settings`); si no existe se devuelven los valores por defecto.
 *
 * v2.191: la primera lectura se difiere al idle (requestIdleCallback con
 * tope de 3 s) para no competir con el LCP de la landing; para que el modo
 * mantenimiento siga siendo infranqueable, `refresh()` (o `reload`) hace una
 * lectura FRESCA y devuelve los settings actualizados: los puntos de acción
 * (p. ej. crear invitación) DEBEN revalidar con refresh() en el momento del
 * clic, nunca fiarse del estado inicial por defecto.
 */
export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (): Promise<PlatformSettings> => {
    let result: PlatformSettings = DEFAULTS;
    try {
      const snap = await getDoc(SETTINGS_REF());
      if (snap.exists()) {
        const d = snap.data() as Partial<PlatformSettings>;
        result = { ...DEFAULTS, ...d };
        setSettings(result);
      }
    } catch {
      // Sin ajustes: se mantienen los por defecto.
    } finally {
      setLoaded(true);
    }
    return result;
  }, []);

  useEffect(() => {
    // Se difiere para no competir con el primer pintado (LCP); si el
    // navegador no soporta idle, se carga de inmediato.
    const scheduleIdle: (cb: () => void) => void =
      typeof globalThis.requestIdleCallback === "function"
        ? (cb) => (globalThis as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(cb, { timeout: 3000 })
        : (cb) => {
            if (document.readyState === "complete") cb();
            else window.addEventListener("load", cb, { once: true });
          };
    const id = scheduleIdle(() => void load());
    // El id de requestIdleCallback es numérico; los listeners no se cancelan.
    void id;
  }, [load]);

  return { settings, loaded, reload: load };
}

/** Utilidades sobre los ajustes (listas separadas por comas). */
function tokenList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function tokenIsBlocked(token: string, blockedTokens: string): boolean {
  return tokenList(blockedTokens).includes(token.toLowerCase());
}
