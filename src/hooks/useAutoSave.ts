import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { setDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { normalizeConfig } from "../lib/utils";
import { encrypt } from "../lib/crypto-utils";
import { getFirestoreErrorMessage } from "../lib/error-utils";

export function useAutoSave(hasStoredConfig, inviteToken, formData, config, onSaveMessage, isSavingRef) {
  const { t } = useTranslation();
  const autoSaveTimerRef = useRef(null);
  const autoSavingRef = useRef(false);

  const doSave = useCallback(async (data) => {
    if (isSavingRef?.current || autoSavingRef.current) return null;
    autoSavingRef.current = true;
    if (isSavingRef) isSavingRef.current = true;
    const payload = normalizeConfig(data);
    try {
      const cpOrig = payload.couplePhoto?.startsWith("data:") ? payload.couplePhoto : null;
      if (payload.bankInfo) payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
      if (cpOrig) payload.couplePhoto = await encrypt(cpOrig, inviteToken);
      delete payload.musicFile;
      await setDoc(invitationDocRef(inviteToken), payload, { merge: true });
      if (cpOrig) payload.couplePhoto = cpOrig;
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
