import { useCallback, useEffect, useRef } from "react";
import { setDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { normalizeConfig } from "../lib/utils";
import { encrypt } from "../lib/crypto-utils";

export function useAutoSave(hasStoredConfig, inviteToken, formData, config, onSaveMessage, isSavingRef) {
  const autoSaveTimerRef = useRef(null);
  const autoSavingRef = useRef(false);

  const doSave = useCallback(async (data) => {
    if (isSavingRef?.current || autoSavingRef.current) return null;
    autoSavingRef.current = true;
    const payload = normalizeConfig(data);
    try {
      const bgOrig = payload.backgroundImage?.startsWith("data:") ? payload.backgroundImage : null;
      const cpOrig = payload.couplePhoto?.startsWith("data:") ? payload.couplePhoto : null;
      if (payload.bankInfo) payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
      if (bgOrig) payload.backgroundImage = await encrypt(bgOrig, inviteToken);
      if (cpOrig) payload.couplePhoto = await encrypt(cpOrig, inviteToken);
      await setDoc(invitationDocRef(inviteToken), payload);
      if (bgOrig) payload.backgroundImage = bgOrig;
      if (cpOrig) payload.couplePhoto = cpOrig;
      return payload;
    } catch {
      return null;
    } finally {
      autoSavingRef.current = false;
    }
  }, [inviteToken, isSavingRef]);

  useEffect(() => {
    if (!hasStoredConfig || !inviteToken) return;
    if (JSON.stringify(formData) === JSON.stringify(config)) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const result = await doSave(formData);
      if (result && onSaveMessage) {
        onSaveMessage("Cambios guardados");
      }
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, hasStoredConfig, inviteToken, doSave, config, onSaveMessage]);

  return { autoSaveTimerRef, doSave };
}
