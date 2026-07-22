import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { setDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { normalizeConfig } from "../lib/utils";
import { encrypt } from "../lib/crypto-utils";

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
      const bgOrig = payload.backgroundImage?.startsWith("data:") ? payload.backgroundImage : null;
      const cpOrig = payload.couplePhoto?.startsWith("data:") ? payload.couplePhoto : null;
      const mfOrig = payload.musicFile?.startsWith("data:") ? payload.musicFile : null;
      if (payload.bankInfo) payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
      if (bgOrig) payload.backgroundImage = await encrypt(bgOrig, inviteToken);
      if (cpOrig) payload.couplePhoto = await encrypt(cpOrig, inviteToken);
      if (mfOrig) payload.musicFile = await encrypt(mfOrig, inviteToken);
      await setDoc(invitationDocRef(inviteToken), payload);
      if (bgOrig) payload.backgroundImage = bgOrig;
      if (cpOrig) payload.couplePhoto = cpOrig;
      if (mfOrig) payload.musicFile = mfOrig;
      return payload;
    } catch {
      return null;
    } finally {
      autoSavingRef.current = false;
      if (isSavingRef) isSavingRef.current = false;
    }
  }, [inviteToken, isSavingRef]);

  useEffect(() => {
    if (!hasStoredConfig || !inviteToken) return;
    if (JSON.stringify(formData) === JSON.stringify(config)) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const result = await doSave(formData);
      if (result && onSaveMessage) {
        onSaveMessage(t("autosave.saved"));
      }
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, hasStoredConfig, inviteToken, doSave, config, onSaveMessage, t]);

  return { autoSaveTimerRef, doSave };
}
