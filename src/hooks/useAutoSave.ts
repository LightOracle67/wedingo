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

  const doSave = useCallback(async (data: InvitationConfig) => {
    if (isSavingRef?.current || autoSavingRef.current) return null;
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
      return payload;
    } catch (e) {
      if (onSaveError) onSaveError(getFirestoreErrorMessage(e, t));
      return null;
    } finally {
      autoSavingRef.current = false;
      if (isSavingRef) isSavingRef.current = false;
    }
  }, [inviteToken, isSavingRef, t, onAutoSaved, onSaveError]);

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
