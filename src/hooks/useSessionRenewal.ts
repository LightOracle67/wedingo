import { useEffect, useRef } from "react";
import { renewSession } from "../lib/sessionVars";

/** Intervalo de renovación de la sesión local (sessionStorage). */
const RENEW_INTERVAL_MS = 60_000;

/**
 * useSessionRenewal — Renueva la sesión local (sessionStorage) cada 60s
 * mientras `enabled` sea true. Centraliza el patrón que antes se duplicaba
 * entre useSetupAuth (admin) y SuperAdminContext (consola), evitando que
 * las dos implementaciones divergieran (TTL local vs Firestore vs Auth).
 */
export function useSessionRenewal(enabled: boolean) {
  const renewRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (enabled) {
      renewSession();
      renewRef.current = setInterval(() => renewSession(), RENEW_INTERVAL_MS);
    } else if (renewRef.current) {
      clearInterval(renewRef.current);
      renewRef.current = null;
    }
    return () => {
      if (renewRef.current) {
        clearInterval(renewRef.current);
        renewRef.current = null;
      }
    };
  }, [enabled]);
}
