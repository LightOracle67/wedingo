import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { setDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { normalizeConfig } from "../lib/utils";
import { encrypt } from "../lib/crypto-utils";
import { getFirestoreErrorMessage } from "../lib/error-utils";
import type { InvitationConfig } from "../types";

export function useAutoSave(
  hasStoredConfig: boolean,
  inviteToken: string,
  formData: InvitationConfig,
  config: InvitationConfig,
  onSaveMessage: ((msg: string) => void) | null,
  isSavingRef: { current: boolean } | null,
) {
  const { t } = useTranslation();
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSavingRef = useRef(false);

  const doSave = useCallback(async (data: InvitationConfig) => {
    if (isSavingRef?.current || autoSavingRef.current) return null;
    autoSavingRef.current = true;
    if (isSavingRef) isSavingRef.current = true;
    const payload = normalizeConfig(data);
    try {
      // Migra las imágenes data-URL a la subcolección configImages (refs
      // __cfgimg:) como hace el guardado manual. Guardarlas inline infla el
      // documento hasta el límite de 1MB y rompe couplePhoto (blob cifrado
      // legacy que el <img> no puede renderizar).
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
      if (payload.bankInfo) payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
      delete (payload as Record<string, unknown>).musicFile;
      await setDoc(invitationDocRef(inviteToken), payload, { merge: true });
      // Restaura las data-URL en memoria para que la sesión siga mostrando las imágenes.
      for (const [k, v] of Object.entries(originalImages)) {
        imagePayload[k] = v;
      }
      return payload;
    } catch (e) {
      if (onSaveMessage) onSaveMessage(getFirestoreErrorMessage(e, t));
      return null;
    } finally {
      autoSavingRef.current = false;
      if (isSavingRef) isSavingRef.current = false;
    }
  }, [inviteToken, isSavingRef, onSaveMessage, t]);

  useEffect(() => {
    if (!hasStoredConfig || !inviteToken) return;
    if (JSON.stringify(formData) === JSON.stringify(config)) return;
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
