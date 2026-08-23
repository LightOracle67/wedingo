import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  writeBatch,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  increment,
  onSnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db, rsvpByInviteRef, rsvpResponseRef } from "../lib/firebase";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { DIETARY_OPTIONS, parseDietaryInfo } from "../lib/rsvp-utils";
import { isValidFullName, normalizeFullName } from "../lib/name-utils";
import { useRsvpSubmit } from "./useRsvpSubmit";
import { trackEvent } from "../lib/analytics";
import { buildMainGuestData, buildCompanionData } from "./rsvp-payloads";
import { STORAGE_KEYS } from "../lib/storage-keys";
import { withWriteRetry } from "../lib/async-utils";
import type { Attendee } from "../types";
import { safeLogError } from "../lib/safe-error";

/**
 * Cache de alergias descifradas por (inviteToken, docId).
 * El onSnapshot vivo descifraba TODO el dietaryInfo en cada snapshot (cada
 * 60s + cada cambio), descifrando repetidamente documentos ya conocidos con
 * AES-GCM (coste no trivial en paneles con muchas respuestas). La clave deriva
 * del inviteToken, así que los datos de una invitación nunca se reutilizan
 * para otra; se descifra solo la primera vez por documento.
 */
const dietaryInfoCache = new Map<string, string>();

interface RsvpFormData {
  guestName: string;
  attendance: string;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  // Flag por acompañante: "yes" | "no". Sustituye a la fecha de nacimiento
  // (minimización GDPR): solo se guarda un booleano derivado en Firestore.
  companionIsChildren: string[];
  companionParentalConsents: boolean[];
  companionHealthConsents: boolean[];
  companionTransportModes: string[];
  companionTransportChoices: string[];
  menuSelection: string;
  allergies: string[];
  allergiesOther: string;
  privacyConsent: boolean;
  healthConsent: boolean;
  transportChoice: string;
  transportMode: string;
  transportTime: string;
  transportPlace: string;
  digitalSignature: boolean;
  phone: string;
  email: string;
  contactConsent: boolean;
  /** Opt-in: mostrar el nombre en la lista pública de confirmados (portada).
   *  Solo se publica si es true (GDPR art. 7: consentimiento afirmativo). */
  showNameInConfirmed: boolean;
}

interface RsvpEntryData {
  id: string;
  rsvpType?: "main" | "companion";
  guestName: string;
  attendance: string;
  dietaryInfo: string;
  attendees: Attendee[];
  companions: number;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  allergiesOther: string;
  mealChoice: string;
  guestNames: string;
  note: string;
  submittedAt: string;
  // Flag de niño leído del doc del acompañante (hidratación del formulario).
  isChild?: boolean;
  parentalConsent?: boolean;
  healthConsent?: boolean;
  transportChoice?: string;
  transportMode?: string;
  transportTime?: string;
  transportPlace?: string;
  companionTransportChoices?: string[];
  companionTransportModes?: string[];
  companionTransportTimes?: string[];
  companionTransportPlaces?: string[];
  companionDocIds?: string[];
  mainGuestDocId?: string;
  mainGuestName?: string;
}

/** Hash estable (FNV-1a) de un nombre normalizado, para derivar los ids de
 *  respuesta del RSVP: un reintento reutiliza el mismo doc (idempotencia).
 *
 *  TRADEOFF DOCUMENTADO: el hash es de 32 bits (base36, ~7 chars), así que
 *  dos invitados DISTINTOS con el mismo nombre normalizado comparten doc y el
 *  segundo sobrescribe al primero. Es un comportamiento aceptado: en una
 *  boda los homónimos exactos son raros y la idempotencia (reintentos no
 *  duplican) vale más que la unicidad absoluta. Si un día se necesitara
 *  unicidad estricta, habría que pasar a un id con sal verificada por el
 *  servidor (p. ej. hash(serverSecret + nombre)) en vez del FNV-1a puro. */
function stableGuestId(name: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function RsvpFormDefault(): RsvpFormData {
  return {
    guestName: "",
    attendance: "alone",
    companionCount: 0,
    companionNames: [],
    companionMenus: [],
    companionAllergies: [],
    companionAllergiesOther: [],
    companionIsChildren: [],
    companionParentalConsents: [],
    companionHealthConsents: [],
    companionTransportModes: [],
    companionTransportChoices: [],
    menuSelection: "",
    allergies: [],
    allergiesOther: "",
    privacyConsent: false,
    healthConsent: false,
    transportChoice: "own",
    transportMode: "own",
    transportTime: "",
    transportPlace: "",
    digitalSignature: false,
    phone: "",
    email: "",
    contactConsent: false,
    // Por defecto NO se publica el nombre (opt-in estricto).
    showNameInConfirmed: false,
  };
}

export function useRsvp(
  inviteToken: string,
  setAdminMessage: (msg: string) => void,
  setAdminMessageType: (type: string) => void,
  menuEnabled: boolean,
  /** Solo el admin con sesión puede leer respuestas (las reglas lo exigen);
   *  el invitado envía sin leer (evita el banner de error falso y el prefill
   *  de datos que no puede consultar). */
  canRead = false,
) {
  const { t } = useTranslation();
  // Confirmaciones accesibles (modal con focus-trap); degrada a window.confirm
  // en entornos sin ConfirmProvider (tests).
  const { confirm } = useConfirm();
  const [rsvpEntries, setRsvpEntries] = useState<RsvpEntryData[]>([]);
  const [rsvpForm, setRsvpForm] = useState<RsvpFormData>(RsvpFormDefault());
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [alreadySubmittedEntry, setAlreadySubmittedEntry] = useState<RsvpEntryData | null>(null);
  /** Error de red al cargar las respuestas (visible para el invitado). */
  const [rsvpLoadError, setRsvpLoadError] = useState(false);
  /** Referencia al reset del error de submit (asignada tras montar
   *  useRsvpSubmit): permite limpiar el mensaje al editar el formulario. */
  const resetErrorRef = useRef<(() => void) | null>(null);
  /** Candado de los borrados (retirar, en lote, vaciar): un doble clic durante
   *  el await aplicaba increment(-N) dos veces y corrompía el contador. */
  const deletingRef = useRef(false);
  /** Contador para forzar la re-hidratación (botón "Reintentar" del invitado). */
  const [hydrateTick, setHydrateTick] = useState(0);
  const prefillRef = useRef<string | null>(null);

  /** Vuelve a cargar las respuestas RSVP tras un fallo de red. */
  const retryLoadRsvp = useCallback(() => {
    setRsvpLoadError(false);
    setHydrateTick((t) => t + 1);
  }, []);

  /** Convierte un QuerySnapshot de respuestas en la lista de entradas
   *  (main + acompañantes individuales), descifrando alergias. Se comparte
   *  entre el hydrate inicial y el listener en vivo (onSnapshot).
   *  El descifrado se cachea por (inviteToken, docId): un documento ya
   *  procesado no se vuelve a descifrar en snapshots posteriores. */
  const processRsvpSnapshot = useCallback(
    async (snapshot: { docs: QueryDocumentSnapshot<DocumentData>[] }) => {
      const allDocs = await Promise.all(
        snapshot.docs.map(async (entryDoc) => {
          const data = entryDoc.data();
          const submittedAt =
            typeof data.submittedAt?.toDate === "function"
              ? data.submittedAt.toDate().toISOString()
              : typeof data.submittedAt === "string"
                ? data.submittedAt
                : data.submittedAt?.seconds
                  ? new Date(data.submittedAt.seconds * 1000).toISOString()
                  : new Date().toISOString();

          const cacheKey = `${inviteToken}|${entryDoc.id}`;
          let decryptedDietaryInfo = typeof data.dietaryInfo === "string" ? data.dietaryInfo : "";
          if (typeof data.dietaryInfo === "string" && data.dietaryInfo !== "") {
            const cached = dietaryInfoCache.get(cacheKey);
            if (cached !== undefined) {
              decryptedDietaryInfo = cached;
            } else {
              decryptedDietaryInfo = await decrypt(data.dietaryInfo, inviteToken);
              dietaryInfoCache.set(cacheKey, decryptedDietaryInfo);
            }
          }

          const attendees = data.attendees || [];

          return {
            id: entryDoc.id,
            rsvpType: (data.rsvpType as "main" | "companion") || (data.mainGuestDocId ? "companion" : "main"),
            guestName: data.guestName || "",
            attendance: data.attendance || "no",
            dietaryInfo: decryptedDietaryInfo,
            attendees,
            companions:
              attendees.length > 0 ? attendees.length : Number.isFinite(data.companions) ? data.companions : 0,
            companionCount: data.companionCount || 0,
            companionNames: data.companionNames || [],
            companionMenus: data.companionMenus || [],
            companionAllergies: data.companionAllergies || [],
            companionAllergiesOther: data.companionAllergiesOther || [],
            allergiesOther: data.allergiesOther || "",
            mealChoice: data.mealChoice || "",
            guestNames: data.guestNames || "",
            note: data.note || "",
            submittedAt,
            parentalConsent: data.parentalConsent || false,
            healthConsent: data.healthConsent || false,
            transportChoice: data.transportChoice || "",
            transportMode: data.transportMode || "",
            transportTime: data.transportTime || "",
            transportPlace: data.transportPlace || "",
            companionTransportChoices: data.companionTransportChoices || [],
            companionTransportModes: data.companionTransportModes || [],
            companionTransportTimes: data.companionTransportTimes || [],
            companionTransportPlaces: data.companionTransportPlaces || [],
            companionDocIds: data.companionDocIds || [],
            mainGuestDocId: data.mainGuestDocId || "",
            mainGuestName: data.mainGuestName || "",
          };
        }),
      );

      // Separate main entries and companion entries
      const mainEntries = allDocs.filter((d) => d.rsvpType === "main" || (!d.rsvpType && !d.mainGuestDocId));
      const companionEntries = allDocs.filter((d) => d.rsvpType === "companion" || d.mainGuestDocId);

      // Attach companion data to main entries and create individual companion entries
      const companionAsEntries: RsvpEntryData[] = [];
      for (const main of mainEntries) {
        const linkedCompanions = companionEntries.filter((c) => c.mainGuestDocId === main.id);
        if (linkedCompanions.length > 0) {
          main.companions = linkedCompanions.length;
          main.companionCount = linkedCompanions.length;
          main.companionNames = linkedCompanions.map((c) => c.guestName);
          main.companionMenus = linkedCompanions.map((c) => c.mealChoice);
          main.companionTransportChoices = linkedCompanions.map((c) => c.transportChoice || "");
          main.companionTransportModes = linkedCompanions.map((c) => c.transportMode || "own");
          main.companionTransportTimes = linkedCompanions.map((c) => c.transportTime || "");
          main.companionTransportPlaces = linkedCompanions.map((c) => c.transportPlace || "");
          main.companionAllergies = linkedCompanions.map((c) => {
            const parsed = parseDietaryInfo(c.dietaryInfo, !!c.mealChoice);
            return [...parsed.dietarySelection, ...(parsed.dietaryOther ? [parsed.dietaryOther] : [])];
          });
          main.companionAllergiesOther = linkedCompanions.map((c) => c.allergiesOther || "");
          main.companionDocIds = linkedCompanions.map((c) => c.id);
          // Create individual companion entries for the attendance list
          for (const comp of linkedCompanions) {
            companionAsEntries.push({
              ...comp,
              // Override with normalized data from the main entry's context
              companions: 0,
              companionCount: 0,
              companionNames: [],
              companionMenus: [],
              companionAllergies: [],
              attendees: [],
            });
          }
        }
      }

      return [...companionAsEntries, ...mainEntries].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
    },
    [inviteToken],
  );

  useEffect(() => {
    // Al cambiar de invitación se descarta la caché de alergias descifradas
    // de la invitación anterior (datos de salud que no deben persistir entre
    // invitaciones ni reutilizarse con otra clave).
    dietaryInfoCache.clear();
    // El invitado público no puede leer respuestas (reglas): la hidratación
    // y el prefill quedan reservados al admin con sesión. Esto elimina el
    // banner de error falso y la caché con datos de salud descifrados.
    if (!canRead) return;

    let cancelled = false;

    const hydrateRsvp = async () => {
      if (!inviteToken) {
        return;
      }

      // Sin caché en sessionStorage: el admin siempre lee datos frescos de
      // Firestore (no se persisten alergias descifradas localmente).
      try {
        const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
        if (cancelled) return;
        const entries = await processRsvpSnapshot(snapshot);
        if (!cancelled) {
          setRsvpEntries(entries);
        }
      } catch (err) {
        safeLogError(["[app]", "[useRsvp]", "hydrate error"], err);
        if (!cancelled) {
          setRsvpEntries([]);
          setRsvpLoadError(true);
          setAdminMessageType("error");
          setAdminMessage(t("rsvp.saveError"));
        }
      }
    };
    hydrateRsvp();
    return () => {
      cancelled = true;
    };
  }, [inviteToken, t, setAdminMessage, setAdminMessageType, hydrateTick, canRead, processRsvpSnapshot]);

  // ── Stats en vivo: listener solo para el admin con sesión ──
  // Las respuestas llegan en tiempo real (otro dispositivo, el propio
  // formulario) sin recargar. El invitado no se suscribe (las reglas no se
  // lo permiten); el listener se cancela al desmontar o al cambiar de token.
  useEffect(() => {
    if (!inviteToken || !canRead) return;
    let cancelled = false;
    const unsub = onSnapshot(
      rsvpByInviteRef(inviteToken),
      (snap) => {
        void processRsvpSnapshot(snap)
          .then((entries) => {
            if (!cancelled) setRsvpEntries(entries);
          })
          .catch(() => {
            /* el siguiente snapshot reintenta */
          });
      },
      (err) => {
        safeLogError(["[app]", "[useRsvp]", "live listen error"], err);
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [inviteToken, canRead, processRsvpSnapshot]);

  // Índice por nombre normalizado (evita recorrer todas las entradas en cada
  // tecla del formulario RSVP cuando hay muchas respuestas).
  const entriesByName = useMemo(() => {
    const map = new Map<string, RsvpEntryData>();
    for (const e of rsvpEntries) {
      const n = normalizeFullName(e.guestName).toLowerCase();
      if (n && !map.has(n)) map.set(n, e);
    }
    return map;
  }, [rsvpEntries]);

  useEffect(() => {
    // Se normaliza igual que al guardar (normalizeFullName colapsa espacios
    // internos) para que "Juan  Pérez" coincida con la respuesta guardada y
    // no se cree un segundo documento por error.
    const name = normalizeFullName(rsvpForm.guestName).toLowerCase();

    if (!name) {
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      return;
    }
    const match = entriesByName.get(name) || null;

    if (match && match.rsvpType === "companion") {
      if (match.id !== prefillRef.current) {
        prefillRef.current = match.id;
        setAlreadySubmittedEntry(match);
        const parsed = parseDietaryInfo(match.dietaryInfo, !!match.mealChoice);
        setRsvpForm((current) => ({
          ...current,
          attendance: "alone",
          companionCount: 0,
          companionNames: [],
          companionMenus: [],
          companionAllergies: [],
          companionIsChildren: [],
          companionParentalConsents: [],
          companionHealthConsents: [],
          companionTransportChoices: [],
          companionTransportModes: [],
          companionTransportTimes: [],
          companionTransportPlaces: [],
          menuSelection: match.mealChoice || "",
          allergies: parsed.dietarySelection,
          allergiesOther: parsed.dietaryOther || match.allergiesOther || "",
          privacyConsent: true,
          healthConsent: match.healthConsent || false,
          parentalConsent: match.parentalConsent || false,
          transportChoice: match.transportChoice || "own",
          transportMode: match.transportMode || "own",
          transportTime: match.transportTime || "",
          transportPlace: match.transportPlace || "",
        }));
      } else {
        setAlreadySubmittedEntry(match);
      }
      return;
    }

    if (match) {
      if (match.id !== prefillRef.current) {
        prefillRef.current = match.id;
        setAlreadySubmittedEntry(match);
        const companionCount = match.companionNames?.length || 0;
        const linkedCompanions = rsvpEntries.filter((e) => e.mainGuestDocId === match.id);
        // Documentos antiguos sin isChild se tratan como adultos ("no").
        const companionIsChildren = linkedCompanions.map((c) => (c.isChild ? "yes" : "no"));
        const companionParentalConsents = linkedCompanions.map((c) => c.parentalConsent || false);
        const companionHealthConsents = linkedCompanions.map((c) => c.healthConsent || false);
        const parsed = parseDietaryInfo(match.dietaryInfo, !!match.mealChoice);
        setRsvpForm((current) => ({
          ...current,
          attendance: companionCount > 0 ? "with" : "alone",
          companionCount,
          companionNames: match.companionNames || [],
          companionMenus: match.companionMenus || [],
          companionAllergies: match.companionAllergies || [],
          companionAllergiesOther: match.companionAllergiesOther || [],
          companionIsChildren,
          companionParentalConsents,
          companionHealthConsents,
          companionTransportChoices: match.companionTransportChoices || [],
          companionTransportModes: match.companionTransportModes || [],
          companionTransportTimes: match.companionTransportTimes || [],
          companionTransportPlaces: match.companionTransportPlaces || [],
          menuSelection: match.mealChoice || "",
          allergies: parsed.dietarySelection,
          allergiesOther: parsed.dietaryOther || match.allergiesOther || "",
          privacyConsent: true,
          healthConsent: match.healthConsent || false,
          parentalConsent: match.parentalConsent || false,
          transportChoice: match.transportChoice || "own",
          transportMode: match.transportMode || "own",
          transportTime: match.transportTime || "",
          transportPlace: match.transportPlace || "",
        }));
      } else {
        setAlreadySubmittedEntry(match);
      }
    } else {
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
    }
  }, [rsvpForm.guestName, entriesByName, rsvpEntries]);

  const updateRsvpField = useCallback((field: string, value: unknown) => {
    // Al editar cualquier campo se oculta el error del último submit.
    resetErrorRef.current?.();

    if (field === "attendance") {
      setRsvpForm((current) => ({
        ...current,
        attendance: value as string,
        companionCount: value === "no" ? 0 : value === "alone" ? 0 : current.companionCount || 1,
        companionNames: value === "no" || value === "alone" ? [] : current.companionNames,
        companionAllergies: value === "no" || value === "alone" ? [] : current.companionAllergies,
      }));
      return;
    }
    if (field === "companionCount") {
      const count = Math.max(0, Math.min(10, Number(value) || 0));
      setRsvpForm((current) => {
        const names = current.companionNames.slice(0, count);
        const allergies = current.companionAllergies.slice(0, count);
        while (names.length < count) {
          names.push("");
          allergies.push([]);
        }
        return {
          ...current,
          companionCount: count,
          companionNames: names,
          companionAllergies: allergies,
        };
      });
      return;
    }
    if (field.startsWith("companionNames[")) {
      const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
      setRsvpForm((current) => {
        const names = [...current.companionNames];
        names[idx] = String(value).slice(0, 120);
        return { ...current, companionNames: names };
      });
      return;
    }
    if (field.startsWith("companionMenus[")) {
      const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
      setRsvpForm((current) => {
        const menus = [...current.companionMenus];
        menus[idx] = String(value);
        return { ...current, companionMenus: menus };
      });
      return;
    }
    if (field.startsWith("companionAllergies[")) {
      const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
      setRsvpForm((current) => {
        const all = [...current.companionAllergies];
        all[idx] = value as string[];
        return { ...current, companionAllergies: all };
      });
      return;
    }
    if (field === "guestName") {
      prefillRef.current = null;
    }
    setRsvpForm((current) => ({ ...current, [field]: value }));
  }, []);

  const validateRsvpData = useCallback(
    (data: RsvpFormData) => {
      if (!data.guestName?.trim()) {
        return t("rsvp.validation.nameRequired");
      }
      if (!isValidFullName(data.guestName)) {
        return t("rsvp.validation.nameFullRequired");
      }
      if (data.attendance === "with" && data.companionCount > 0) {
        for (let i = 0; i < data.companionCount; i++) {
          if (!data.companionNames[i]?.trim()) {
            return t("rsvp.validation.nameRequired");
          }
          if (!isValidFullName(data.companionNames[i]!)) {
            return t("rsvp.validation.nameFullRequired");
          }
          // Un acompañante marcado como niño exige el consentimiento parental:
          // sin él, el envío se bloquea (requisito GDPR para menores).
          if (data.companionIsChildren?.[i] === "yes" && !data.companionParentalConsents?.[i]) {
            return t("rsvp.validation.parentalConsentRequired");
          }
        }
      }
      if (data.attendance !== "no" && menuEnabled && !data.menuSelection) {
        return t("rsvp.validation.menuRequired");
      }
      if (!data.privacyConsent) {
        return t("rsvp.validation.privacyRequired");
      }
      return null;
    },
    [t, menuEnabled],
  );

  const submitRsvpData = useCallback(
    async (data: RsvpFormData) => {
      // Copia defensiva: nunca se muta directamente el estado de React.
      const form = {
        ...data,
        guestName: normalizeFullName(data.guestName),
        companionNames: (data.companionNames || []).map(normalizeFullName),
      };
      const allergies = form.allergies || [];
      // El texto libre de alergias (allergiesOther) es también dato de salud:
      // se integra en el string cifrado para no almacenarlo en claro.
      const other = (form.allergiesOther || "").trim();
      const dietaryInfo = [allergies.filter(Boolean).join(" | "), other].filter(Boolean).join(" | ");
      const encryptedDietaryInfo = await encrypt(dietaryInfo, inviteToken);
      // Sin fechas de nacimiento (GDPR): solo el flag booleano isChild por acompañante.
      const single = form.guestName.trim();
      const now = new Date().toISOString();
      const isAttending = form.attendance !== "no";
      const companionCount = form.companionCount || 0;
      const nowTimestamp = serverTimestamp();

      // Id DETERMINISTA del nombre normalizado: un reintento tras un commit con
      // red perdida sobrescribe el mismo doc en vez de crear un duplicado (el
      // candado del submit solo evita el doble clic en el mismo tick).
      const mainGuestId = `main_${stableGuestId(single)}`;
      const mainGuestData = buildMainGuestData({
        data: form,
        isAttending,
        companionCount,
        single,
        encryptedDietaryInfo,
        inviteToken,
        nowTimestamp,
      });

      // Create companion docs with individual dietaryInfo (ids estables por
      // índice, para que el retry no cree compañeros duplicados)
      const companionDocIds: string[] = [];
      const companionPayloads: Array<Record<string, unknown>> = [];
      for (let i = 0; i < companionCount; i++) {
        companionDocIds.push(`comp_${stableGuestId(single)}_${i}`);
        const compAllergies = form.companionAllergies[i] || [];
        const compDietaryInfo = compAllergies.filter(Boolean).join(" | ");
        const encCompDietary = await encrypt(compDietaryInfo, inviteToken);
        // Sin fecha de nacimiento en compañeros
        const companionData = buildCompanionData({
          data: form,
          i,
          single,
          mainGuestId,
          encCompDietary,
          nowTimestamp,
          inviteToken,
        });
        companionPayloads.push(companionData);
      }

      mainGuestData.companionDocIds = companionDocIds;

      try {
        // Contador por invitación: el documento grupo rsvpResponses/{inviteToken}
        // guarda el contador (las reglas exigen que exista y esté por debajo de
        // RSVP_MAX_RESPONSES) y se incrementa en el mismo lote para mantener el tope anti-spam.
        const counterRef = doc(db, "rsvpResponses", inviteToken);
        try {
          const counterSnap = await getDoc(counterRef);
          if (!counterSnap.exists()) {
            await setDoc(counterRef, { count: 0 });
          }
        } catch (counterErr) {
          safeLogError(["[app]", "[useRsvp]", "RSVP counter setup failed"], counterErr);
        }

        const batch = writeBatch(db);
        batch.set(rsvpResponseRef(inviteToken, mainGuestId), mainGuestData);
        for (let i = 0; i < companionCount; i++) {
          batch.set(rsvpResponseRef(inviteToken, companionDocIds[i]!), companionPayloads[i]);
        }
        // Lista pública de confirmados: solo cuando asiste Y da consentimiento
        // explícito (GDPR art. 7). La regla es create-only (id estable del
        // nombre), así que un reintento no duplica ni suplanta.
        if (isAttending && form.showNameInConfirmed) {
          batch.set(doc(db, "invitations", inviteToken, "confirmedPeople", `c_${stableGuestId(single)}`), {
            name: single.slice(0, 60),
            createdAt: nowTimestamp,
          });
        }
        // Incremento atómico: dos invitados a la vez ya no pisan el contador
        // (el set con un valor leído perdía un envío completo por carrera).
        batch.update(counterRef, { count: increment(1) });
        await withWriteRetry(() => batch.commit());
      } catch (err) {
        safeLogError(["[app]", "[useRsvp]", "RSVP batch write failed"], err);
        // El tope anti-spam (RSVP_MAX_RESPONSES) lo aplican las reglas en el
        // increment del contador: se traduce como permission-denied en el lote.
        // Se distingue del resto de fallos para dar un aviso claro en vez del
        // genérico (antes el invitado veía "algo salió mal" sin explicación).
        const code =
          err && typeof err === "object" && "code" in err ? String((err as Record<string, unknown>).code) : "";
        throw new Error(code === "permission-denied" ? t("rsvp.limitReached") : t("rsvp.saveError"));
      }

      const mainEntry: RsvpEntryData = {
        id: mainGuestId,
        rsvpType: "main",
        guestName: single,
        attendance: isAttending ? "yes" : "no",
        dietaryInfo,
        attendees: [],
        companions: companionCount,
        companionCount,
        companionNames: mainGuestData.companionNames as string[],
        companionMenus: mainGuestData.companionMenus as string[],
        companionAllergies: mainGuestData.companionAllergies as string[][],
        companionAllergiesOther: mainGuestData.companionAllergiesOther as string[],
        allergiesOther: mainGuestData.allergiesOther as string,
        mealChoice: (mainGuestData.mealChoice as string) || "",
        guestNames: "",
        note: "",
        submittedAt: now,
        transportChoice: (mainGuestData.transportChoice as string) || "",
        transportMode: (mainGuestData.transportMode as string) || "",
        transportTime: (mainGuestData.transportTime as string) || "",
        transportPlace: (mainGuestData.transportPlace as string) || "",
        companionTransportChoices: mainGuestData.companionTransportChoices as string[],
        companionTransportModes: mainGuestData.companionTransportModes as string[],
        companionTransportTimes: mainGuestData.companionTransportTimes as string[],
        companionTransportPlaces: mainGuestData.companionTransportPlaces as string[],
        companionDocIds,
      };

      setRsvpEntries((current) => [mainEntry, ...current]);
      setRsvpMessage(
        isAttending ? t("rsvp.successAttending", { name: single }) : t("rsvp.successNotAttending", { name: single }),
      );
      // Analítica del envío (solo si hay consentimiento; import estático, el
      // módulo ya está en el grafo).
      try {
        trackEvent("rsvp_submit", { attendance: isAttending ? "yes" : "no" });
      } catch (err) {
        safeLogError(["[app]", "[useRsvp]", "trackEvent failed"], err);
      }
      setRsvpForm(RsvpFormDefault());
      setHasSubmitted(true);
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      // Invalida la caché para que la próxima visita refleje el nuevo estado.
      try {
        sessionStorage.removeItem(STORAGE_KEYS.rsvpCache(inviteToken));
      } catch {}
    },
    [inviteToken, t],
  );

  const {
    submitting,
    submitError,
    handleSubmit: submitViaHook,
    resetError,
  } = useRsvpSubmit({
    token: inviteToken,
    onSubmit: submitRsvpData as unknown as (data: Record<string, unknown>) => Promise<void>,
    validate: validateRsvpData as unknown as (data: Record<string, unknown>) => string | null,
  });
  resetErrorRef.current = resetError;

  const isRsvpSubmitting = submitting;
  const feedbackMessage = submitError || rsvpMessage;

  const handleRsvpSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      if (submitting) return;
      submitViaHook(rsvpForm as unknown as Record<string, unknown>);
    },
    [submitting, submitViaHook, rsvpForm],
  );

  const handleDeleteRsvp = useCallback(async () => {
    if (!alreadySubmittedEntry?.id || deletingRef.current) return;
    if (!(await confirm({ message: t("rsvp.withdrawConfirm"), danger: true }))) {
      return;
    }
    deletingRef.current = true;
    try {
      const batch = writeBatch(db);
      batch.delete(rsvpResponseRef(inviteToken, alreadySubmittedEntry.id));
      for (const cid of alreadySubmittedEntry.companionDocIds || []) {
        batch.delete(rsvpResponseRef(inviteToken, cid));
      }
      // Retirar libera un hueco del tope anti-spam (increment -1).
      batch.update(doc(db, "rsvpResponses", inviteToken), { count: increment(-1) });
      await withWriteRetry(() => batch.commit());
      const idsToRemove = new Set([alreadySubmittedEntry.id, ...(alreadySubmittedEntry.companionDocIds || [])]);
      setRsvpEntries((current) => current.filter((e) => !idsToRemove.has(e.id)));
      setRsvpMessage(t("rsvp.withdrawSuccess"));
      setRsvpForm(RsvpFormDefault());
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      setHasSubmitted(false);
      try {
        sessionStorage.removeItem(STORAGE_KEYS.rsvpCache(inviteToken));
      } catch {}
    } catch (err) {
      safeLogError(["[app]", "[useRsvp]", "withdraw error"], err);
      setRsvpMessage(t("rsvp.withdrawError"));
    } finally {
      deletingRef.current = false;
    }
  }, [alreadySubmittedEntry, t, inviteToken, confirm]);

  const handleDeleteRsvpEntries = useCallback(
    async (ids: string[]) => {
      if (!ids.length || deletingRef.current) return;
      if (!(await confirm({ message: t("attendance.deleteSelectedConfirm", { count: ids.length }), danger: true }))) {
        return;
      }
      deletingRef.current = true;
      try {
        const batch = writeBatch(db);
        for (const id of ids) {
          batch.delete(rsvpResponseRef(inviteToken, id));
        }
        // El contador rsvpResponses/{token}.count se incrementa +1 POR
        // CONFIRMACIÓN (no por fila): una confirmación crea la fila principal +
        // una fila por cada acompañante, pero solo suma 1 al tope anti-spam.
        // Al borrar en lote, `ids` puede incluir filas de acompañantes (el
        // admin las expande), así que se decrementa por el número de entradas
        // PRINCIPALES borradas y no por ids.length (evita sobre-decrementar el
        // contador y dejar el tope anti-spam desincronizado).
        const mainDeleted = ids.filter((id) => {
          const entry = rsvpEntries.find((e) => e.id === id);
          return !entry || entry.rsvpType !== "companion";
        }).length;
        batch.update(doc(db, "rsvpResponses", inviteToken), { count: increment(-mainDeleted) });
        await withWriteRetry(() => batch.commit());
        setRsvpEntries((current) => current.filter((e) => !ids.includes(e.id)));
        setAdminMessage(t("attendance.deleteSelectedSuccess", { count: ids.length }));
        setAdminMessageType("success");
      } catch (err) {
        safeLogError(["[app]", "[useRsvp]", "delete selected error"], err);
        setAdminMessage(t("attendance.deleteSelectedError"));
        setAdminMessageType("error");
      } finally {
        deletingRef.current = false;
      }
    },
    [setAdminMessage, setAdminMessageType, t, inviteToken, confirm, rsvpEntries],
  );

  const handleClearRsvpEntries = useCallback(async () => {
    if (deletingRef.current) return;
    if (!(await confirm({ message: t("rsvp.clearConfirm"), danger: true }))) {
      return;
    }
    deletingRef.current = true;
    try {
      const snapshot = await getDocs(rsvpByInviteRef(inviteToken));

      await Promise.all(snapshot.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));
      await withWriteRetry(() =>
        updateDoc(doc(db, "rsvpResponses", inviteToken), { count: increment(-snapshot.size) }),
      );
      setRsvpEntries([]);
      setAdminMessage(t("rsvp.clearSuccess"));
      setAdminMessageType("success");
      try {
        sessionStorage.removeItem(STORAGE_KEYS.rsvpCache(inviteToken));
      } catch {}
    } catch (err) {
      safeLogError(["[app]", "[useRsvp]", "clear error"], err);
      setAdminMessage(t("rsvp.clearError"));
      setAdminMessageType("error");
    } finally {
      deletingRef.current = false;
    }
  }, [inviteToken, setAdminMessage, setAdminMessageType, t, confirm]);

  // Memoizado: un objeto literal nuevo en cada render invalidaba el value del
  // AppContext (que depende de este objeto) y re-renderizaba a todos los
  // consumidores de useApp() con cada tecla del formulario RSVP.
  return useMemo(
    () => ({
      rsvpEntries,
      rsvpForm,
      rsvpMessage: feedbackMessage,
      isRsvpSubmitting,
      hasSubmitted,
      alreadySubmittedEntry,
      rsvpLoadError,
      retryLoadRsvp,
      updateRsvpField,
      handleRsvpSubmit,
      handleDeleteRsvpEntries,
      handleClearRsvpEntries,
      handleDeleteRsvp,
      DIETARY_OPTIONS,
      setRsvpMessage,
      setRsvpForm,
    }),
    [
      rsvpEntries,
      rsvpForm,
      feedbackMessage,
      isRsvpSubmitting,
      hasSubmitted,
      alreadySubmittedEntry,
      rsvpLoadError,
      retryLoadRsvp,
      updateRsvpField,
      handleRsvpSubmit,
      handleDeleteRsvpEntries,
      handleClearRsvpEntries,
      handleDeleteRsvp,
      setRsvpMessage,
      setRsvpForm,
    ],
  );
}
