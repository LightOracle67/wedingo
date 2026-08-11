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
   *  gifts, rides, reactions, notes, songs, trivia. Kill-switch por función. */
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
 */
export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const snap = await getDoc(SETTINGS_REF());
      if (snap.exists()) {
        const d = snap.data() as Partial<PlatformSettings>;
        setSettings({ ...DEFAULTS, ...d });
      }
    } catch {
      // Sin ajustes: se mantienen los por defecto.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
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
