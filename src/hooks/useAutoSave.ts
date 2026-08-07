import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { setDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { normalizeConfig } from "../lib/utils";
import { encrypt } from "../lib/crypto-utils";
import { getFirestoreErrorMessage } from "../lib/error-utils";
import { isValidGoogleMapsUrl } from "../lib/geo-utils";
import type { InvitationConfig } from "../types";

export function useAutoSave(
  hasStoredConfig: boolean,
  inviteToken: string,
  formData: InvitationConfig,
  config: InvitationConfig,
  onSaveMessage: ((msg: string) => void) | null,
  isSavingRef: { current: boolean } | null,
  onAutoSaved?: (data: InvitationConfig) => void,
  onSaveError?: (msg: string) => void,
) {
  const { t } = useTranslation();
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSavingRef = useRef(false);
  /** Marca que el último guardado falló por red o estaba ocupado (permite
   *  reintentar sin bucle infinito con validaciones rotas). */
  const lastSaveFailedRef = useRef(false);

  const doSave = useCallback(
    async (data: InvitationConfig) => {
      if (isSavingRef?.current || autoSavingRef.current) {
        // Ocupado: la edición aún no se persiste, se reintentará.
        lastSaveFailedRef.current = true;
        return null;
      }
      autoSavingRef.current = true;
      if (isSavingRef) isSavingRef.current = true;
      try {
        // Primero se migran las imágenes data-URL a configImages: así una foto
        // recién subida no se pierde aunque la validación de nombres falle.
        const payload = normalizeConfig(data);
        const { saveConfigImage } = await import("../lib/image-store");
        const originalImages: Record<string, string> = {};
        const imagePayload = payload as Record<string, string | undefined>;
        for (const imageId of ["couplePhoto", "backgroundImage", "customSeal", "cornerDecoration"] as const) {
          const val = imagePayload[imageId];
          if (typeof val === "string" && val.startsWith("data:")) {
            originalImages[imageId] = val;
            imagePayload[imageId] = await saveConfigImage(inviteToken, imageId, val);
          }
        }

        // El autosave NO debe persistir configuraciones que rompan la
        // invitación pública: nombres vacíos (hero vacío) o una URL de mapa
        // inválida (mapa muerto). El resto se valida en el guardado manual.
        if (!data.firstName?.trim() || !data.secondName?.trim()) {
          if (onSaveError) onSaveError(t("errors.bothNamesRequired"));
          return null;
        }
        if (data.weddingSiteURL && !isValidGoogleMapsUrl(data.weddingSiteURL)) {
          if (onSaveError) onSaveError(t("errors.mapUrlInvalid"));
          return null;
        }
        // Alineación con el guardado manual: no se autoguardan estados rotos
        // (código de vestimenta "Otro" sin texto o salidas de transporte sin hora).
        if (data.weddingDressCode === "Otro" && !data.weddingDressCodeCustom?.trim()) {
          if (onSaveError) onSaveError(t("errors.dressCodeCustomRequired"));
          return null;
        }
        try {
          const departures = JSON.parse(data.transportDepartures || "[]") as Array<{ time?: string; url?: string }>;
          for (const d of departures) {
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time || "")) {
              if (onSaveError) onSaveError(t("errors.transportTimeInvalid"));
              return null;
            }
            if (d.url && !isValidGoogleMapsUrl(d.url)) {
              if (onSaveError) onSaveError(t("errors.transportUrlInvalid"));
              return null;
            }
          }
        } catch {
          /* departures no presente: se ignora */
        }

        // El menú habilitado sin platos rompería la invitación pública (el
        // guardado manual lo bloquea; el autosave no).
        if (data.menuEnabled === "true") {
          const hasDishes = ["menuCarneDishes", "menuPescadoDishes", "menuVeganoDishes", "menuTextoDishes"].some(
            (k) => {
              const raw = (data as Record<string, unknown>)[k];
              if (typeof raw !== "string" || !raw.trim()) return false;
              try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) && parsed.some((d) => d && typeof d.text === "string" && d.text.trim());
              } catch {
                return false;
              }
            },
          );
          if (!hasDishes) {
            if (onSaveError) onSaveError(t("errors.menuRequired"));
            return null;
          }
        }

        if (payload.bankInfo) payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
        delete (payload as Record<string, unknown>).musicFile;
        await setDoc(invitationDocRef(inviteToken), payload, { merge: true });
        // Actualiza el config en memoria para que la vista previa del admin
        // muestre los cambios autoguardados sin recargar.
        if (onAutoSaved) onAutoSaved(normalizeConfig(data));
        // Restaura las data-URL en memoria para que la sesión siga mostrando las imágenes.
        for (const [k, v] of Object.entries(originalImages)) {
          imagePayload[k] = v;
        }
        lastSaveFailedRef.current = false;
        return payload;
      } catch (e) {
        lastSaveFailedRef.current = true;
        if (onSaveError) onSaveError(getFirestoreErrorMessage(e, t));
        return null;
      } finally {
        autoSavingRef.current = false;
        if (isSavingRef) isSavingRef.current = false;
      }
    },
    [inviteToken, isSavingRef, t, onAutoSaved, onSaveError],
  );

  useEffect(() => {
    if (!hasStoredConfig || !inviteToken) return;
    // Se compara el formData NORMALIZADO contra config: si el usuario deja un
    // espacio final ("Ana "), la normalización al guardar lo recorta, y sin
    // este ajuste el autosave se relanzaba infinitamente cada 1,5 s.
    if (JSON.stringify(normalizeConfig(formData)) === JSON.stringify(config)) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const result = await doSave(formData);
      if (result && onSaveMessage) {
        onSaveMessage(t("autosave.saved"));
      } else if (result === null && lastSaveFailedRef.current) {
        // Fallo de red o autosave ocupado: se reintenta una vez a los 2 s
        // para no perder las ediciones en curso.
        lastSaveFailedRef.current = false;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
          const retry = await doSave(formData);
          if (retry && onSaveMessage) onSaveMessage(t("autosave.saved"));
        }, 2000);
      }
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [formData, hasStoredConfig, inviteToken, doSave, config, onSaveMessage, t]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []);

  return { autoSaveTimerRef, doSave };
}
