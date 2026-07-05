import { useCallback, useEffect, useRef } from "react";
import { setDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { normalizeConfig } from "../lib/utils";
import { defaultConfig } from "../lib/constants";

export function useAutoSave(hasStoredConfig, inviteToken, formData, config, onSaveMessage, isSavingRef) {
  const autoSaveTimerRef = useRef(null);

  const doSave = useCallback(async (data) => {
    if (isSavingRef?.current) return null;
    if (isSavingRef) isSavingRef.current = true;
    const payload = { ...defaultConfig, ...normalizeConfig(data) };
    try {
      await setDoc(invitationDocRef(inviteToken), payload);
      return payload;
    } catch {
      return null;
    } finally {
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
        onSaveMessage("Cambios guardados");
      }
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, hasStoredConfig, inviteToken, doSave, config, onSaveMessage]);

  return { autoSaveTimerRef, doSave };
}
