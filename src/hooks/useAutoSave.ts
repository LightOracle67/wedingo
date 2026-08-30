import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { setDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { normalizeConfig } from "../lib/utils";
import { encrypt } from "../lib/crypto-utils";
import { getFirestoreErrorMessage } from "../lib/error-utils";
import { isValidGoogleMapsUrl } from "../lib/geo-utils";
import { computeSetupChanges } from "../contexts/save-config-core";
import type { InvitationConfig } from "../types";

/** Campos pesados que NO participan en la firma ligera de cambios: la música
 *  es un data-URL WAV (~10 MB base64) y las fotos data-URL descifradas
 *  (~866 KB cada una). Serializarlos en cada tecla bloqueaba el hilo
 *  principal (20–80 ms por pulsación en el editor). Se comparan por
 *  identidad (===), que es O(1) para strings de distinta longitud y mucho
 *  más barato que un JSON.stringify de 10 MB. */
const HEAVY_FIELDS = new Set([
  "musicFile",
  "couplePhoto",
  "backgroundImage",
  "customSeal",
  "cornerDecoration",
]);

/** Firma ligera de la config: JSON de los campos "pequeños" (sin data-URLs
 *  pesadas). Se usa para detectar si el borrador difiere de lo persistido. */
function lightSignature(cfg: InvitationConfig): string {
  const light: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(cfg)) {
    if (!HEAVY_FIELDS.has(key)) light[key] = value;
  }
  return JSON.stringify(light);
}

/** Compara los campos pesados por identidad (barato: longitud + contenido
 *  solo si son igual de largos). */
function heavyFieldsDiffer(a: InvitationConfig, b: InvitationConfig): boolean {
  for (const key of HEAVY_FIELDS) {
    if (a[key as keyof InvitationConfig] !== b[key as keyof InvitationConfig]) return true;
  }
  return false;
}

export function useAutoSave(
  hasStoredConfig: boolean,
  inviteToken: string,
  formData: InvitationConfig,
  config: InvitationConfig,
  onSaveMessage: ((msg: string) => void) | null,
  isSavingRef: { current: boolean } | null,
  onAutoSaved?: (data: InvitationConfig) => void,
  onSaveError?: (msg: string) => void,
  /** Ref al token ACTUALMENTE activo (el provider actualiza currentRef al
   *  hidratar/cambiar de invitación). Sin esto, un autosave programado para A
   *  podía dispararse con el token de B y escribir los datos de A en el doc de
   *  B (corrupción de datos entre invitaciones). */
  currentTokenRef?: { current: string },
) {
  const { t } = useTranslation();
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSavingRef = useRef(false);
  /** Marca que el último guardado falló por red o estaba ocupado (permite
   *  reintentar sin bucle infinito con validaciones rotas). */
  const lastSaveFailedRef = useRef(false);
  /** Ref al borrador más reciente: el timer usa esta ref y no se re-programa
   *  por cada render (las deps del efecto ya no incluyen formData). */
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  /** Config persistida más reciente (para el diff incremental). */
  const configRef = useRef(config);
  configRef.current = config;

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
        // Normalizado: se trimea y se pasan los valores a string canónico.
        const normalized = normalizeConfig(data);

        // ── Guardado INCREMENTAL (v2.185) ────────────────────────────────
        // Antes se escribía el documento COMPLETO (~60 campos + bankInfo
        // re-cifrado con IV nuevo en cada autosave → el doc siempre quedaba
        // "modificado" y el churn de escrituras era alto). El diff solo envía
        // los campos cambiados + los alwaysInclude de las reglas.
        const { payload } = computeSetupChanges(normalized, configRef.current, hasStoredConfig);
        const payloadRecord = payload as Record<string, unknown>;

        // Primero se migran las imágenes data-URL a configImages: así una foto
        // recién subida no se pierde aunque la validación de nombres falle.
        const { saveConfigImage } = await import("../lib/image-store");
        const originalImages: Record<string, string> = {};
        for (const imageId of ["couplePhoto", "backgroundImage", "customSeal", "cornerDecoration"] as const) {
          const val = payloadRecord[imageId];
          if (typeof val === "string" && val.startsWith("data:")) {
            originalImages[imageId] = val;
            payloadRecord[imageId] = await saveConfigImage(inviteToken, imageId, val);
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
        // (código de vestimenta "custom" sin texto o salidas sin hora).
        if (data.weddingDressCode === "custom" && !data.weddingDressCodeCustom?.trim()) {
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

        // Si el payload incluye bankInfo, es PORQUE cambió (diff incremental):
        // se cifra aquí, nunca en cada autosave (cifrar siempre forzaba bytes
        // nuevos por el IV y marcaba el doc como modificado sin necesidad).
        if (payloadRecord.bankInfo) payloadRecord.bankInfo = await encrypt(payloadRecord.bankInfo as string, inviteToken);
        // La música se guarda en su subcolección cifrada, nunca en el doc.
        delete payloadRecord.musicFile;
        // GUARD CRÍTICO de carrera A→B: si entre que se programó el autosave y
        // ahora el usuario navegó a otra invitación, NO se escribe (evita
        // volcar los datos de A dentro del doc de B).
        if (currentTokenRef?.current && currentTokenRef.current !== inviteToken) {
          lastSaveFailedRef.current = true;
          return null;
        }
        await setDoc(invitationDocRef(inviteToken), payloadRecord, { merge: true });
        // Actualiza el config en memoria para que la vista previa del admin
        // muestre los cambios autoguardados sin recargar.
        if (onAutoSaved) onAutoSaved(normalizeConfig(data));
        // Restaura las data-URL en memoria para que la sesión siga mostrando las imágenes.
        for (const [k, v] of Object.entries(originalImages)) {
          payloadRecord[k] = v;
        }
        lastSaveFailedRef.current = false;
        return payloadRecord;
      } catch (e) {
        lastSaveFailedRef.current = true;
        if (onSaveError) onSaveError(getFirestoreErrorMessage(e, t));
        return null;
      } finally {
        autoSavingRef.current = false;
        if (isSavingRef) isSavingRef.current = false;
      }
    },
    [inviteToken, isSavingRef, t, onAutoSaved, onSaveError, currentTokenRef, hasStoredConfig],
  );

  // Firmas LIGERAS memoizadas (v2.185): antes se hacía
  // JSON.stringify(normalizeConfig(formData)) + JSON.stringify(config) por
  // tecla, serializando ~13 MB (música WAV + 4 imágenes) DOS veces por
  // pulsación. La firma excluye los campos pesados (comparados por ===).
  const normalizedSignature = useMemo(() => lightSignature(formData), [formData]);
  const configSignature = useMemo(() => lightSignature(config), [config]);
  const isDirty =
    normalizedSignature !== configSignature || heavyFieldsDiffer(formData, config);

  useEffect(() => {
    if (!hasStoredConfig || !inviteToken) return;
    // Se compara el borrador NORMALIZADO contra config: si el usuario deja un
    // espacio final ("Ana "), la normalización al guardar lo recorta, y sin
    // este ajuste el autosave se relanzaba infinitamente cada 1,5 s.
    if (!isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const result = await doSave(formDataRef.current);
      if (result && onSaveMessage) {
        onSaveMessage(t("autosave.saved"));
      } else if (result === null && lastSaveFailedRef.current) {
        // Fallo de red o autosave ocupado: se reintenta una vez a los 2 s
        // para no perder las ediciones en curso.
        lastSaveFailedRef.current = false;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
          const retry = await doSave(formDataRef.current);
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
  }, [isDirty, hasStoredConfig, inviteToken, doSave, onSaveMessage, t]);

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
