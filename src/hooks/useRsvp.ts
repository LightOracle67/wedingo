import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { writeBatch, deleteDoc, doc, getDoc, setDoc, getDocs, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db, rsvpByInviteRef, rsvpResponseRef } from "../lib/firebase";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { computeAge } from "../lib/date-utils";
import { DIETARY_OPTIONS, parseDietaryInfo } from "../lib/rsvp-utils";
import { isValidFullName, normalizeFullName } from "../lib/name-utils";
import { useRsvpSubmit } from "./useRsvpSubmit";
import { buildMainGuestData, buildCompanionData } from "./rsvp-payloads";
import { STORAGE_KEYS } from "../lib/storage-keys";
import type { Attendee } from "../types";

interface RsvpFormData {
  guestName: string;
  attendance: string;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  companionBirthDates: string[];
  companionParentalConsents: boolean[];
  companionHealthConsents: boolean[];
  companionTransportChoices: string[];
  companionTransportModes: string[];
  companionTransportTimes: string[];
  companionTransportPlaces: string[];
  menuSelection: string;
  allergies: string[];
  allergiesOther: string;
  privacyConsent: boolean;
  healthConsent: boolean;
  birthDate: string;
  parentalConsent: boolean;
  transportChoice: string;
  transportMode: string;
  transportTime: string;
  transportPlace: string;
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
  birthDate?: string;
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

function RsvpFormDefault(): RsvpFormData {
  return {
    guestName: "",
    attendance: "alone",
    companionCount: 0,
    companionNames: [],
    companionMenus: [],
    companionAllergies: [],
    companionAllergiesOther: [],
    companionBirthDates: [],
    companionParentalConsents: [],
    companionHealthConsents: [],
    companionTransportChoices: [],
    companionTransportModes: [],
    companionTransportTimes: [],
    companionTransportPlaces: [],
    menuSelection: "",
    allergies: [],
    allergiesOther: "",
    privacyConsent: false,
    healthConsent: false,
    birthDate: "",
    parentalConsent: false,
    transportChoice: "own",
    transportMode: "own",
    transportTime: "",
    transportPlace: "",
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
  const [rsvpEntries, setRsvpEntries] = useState<RsvpEntryData[]>([]);
  const [rsvpForm, setRsvpForm] = useState<RsvpFormData>(RsvpFormDefault());
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [alreadySubmittedEntry, setAlreadySubmittedEntry] = useState<RsvpEntryData | null>(null);
  /** Error de red al cargar las respuestas (visible para el invitado). */
  const [rsvpLoadError, setRsvpLoadError] = useState(false);
  /** Contador para forzar la re-hidratación (botón "Reintentar" del invitado). */
  const [hydrateTick, setHydrateTick] = useState(0);
  const prefillRef = useRef<string | null>(null);

  /** Vuelve a cargar las respuestas RSVP tras un fallo de red. */
  const retryLoadRsvp = useCallback(() => {
    setRsvpLoadError(false);
    setHydrateTick((t) => t + 1);
  }, []);

  useEffect(() => {
    // El invitado público no puede leer respuestas (reglas): la hidratación
    // y el prefill quedan reservados al admin con sesión. Esto elimina el
    // banner de error falso y la caché con datos de salud descifrados.
    if (!canRead) return;

    let cancelled = false;
    const hydrateRsvp = async () => {
      if (!inviteToken) { return; }

      // Sin caché en sessionStorage: el admin siempre lee datos frescos de
      // Firestore (no se persisten alergias descifradas localmente).
      try {
        const snapshot = await getDocs(rsvpByInviteRef(inviteToken));

        if (cancelled) return;

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

            const decryptedDietaryInfo =
              typeof data.dietaryInfo === "string"
                ? await decrypt(data.dietaryInfo, inviteToken)
                : "";

            const attendees = data.attendees || [];

              return {
                id: entryDoc.id,
                rsvpType: (data.rsvpType as "main" | "companion") || (data.mainGuestDocId ? "companion" : "main"),
                guestName: data.guestName || "",
                attendance: data.attendance || "no",
                dietaryInfo: decryptedDietaryInfo,
                attendees,
                companions: attendees.length > 0 ? attendees.length : (Number.isFinite(data.companions) ? data.companions : 0),
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
                birthDate: data.birthDate || "",
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

        const entries = [...companionAsEntries, ...mainEntries].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        );
        if (!cancelled) {
          setRsvpEntries(entries);
        }
      } catch (err) {
        console.error("[app]", "[useRsvp]", "hydrate error", { error: err });
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
  }, [inviteToken, t, setAdminMessage, setAdminMessageType, hydrateTick, canRead]);

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
    const match = rsvpEntries.find((e) => normalizeFullName(e.guestName).toLowerCase() === name) || null;

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
          companionBirthDates: [],
          companionParentalConsents: [],
          companionHealthConsents: [],
          companionTransportChoices: [],
          companionTransportModes: [],
          companionTransportTimes: [],
          companionTransportPlaces: [],
          menuSelection: match.mealChoice || "",
          birthDate: match.birthDate || "",
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
        const companionBirthDates = linkedCompanions.map((c) => c.birthDate || "");
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
          companionBirthDates,
          companionParentalConsents,
          companionHealthConsents,
          companionTransportChoices: match.companionTransportChoices || [],
          companionTransportModes: match.companionTransportModes || [],
          companionTransportTimes: match.companionTransportTimes || [],
          companionTransportPlaces: match.companionTransportPlaces || [],
          menuSelection: match.mealChoice || "",
          birthDate: match.birthDate || "",
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
  }, [rsvpForm.guestName, rsvpEntries]);

  const updateRsvpField = useCallback((field: string, value: unknown) => {

    if (field === "attendance") {
      setRsvpForm((current) => ({
        ...current,
        attendance: value as string,
        companionCount: value === "no" ? 0 : (value === "alone" ? 0 : (current.companionCount || 1)),
        companionNames: value === "no" || value === "alone" ? [] : current.companionNames,
        companionMenus: value === "no" || value === "alone" ? [] : current.companionMenus,
        companionAllergies: value === "no" || value === "alone" ? [] : current.companionAllergies,
        companionAllergiesOther: value === "no" || value === "alone" ? [] : current.companionAllergiesOther,
        companionBirthDates: value === "no" || value === "alone" ? [] : current.companionBirthDates,
        companionParentalConsents: value === "no" || value === "alone" ? [] : current.companionParentalConsents,
        companionHealthConsents: value === "no" || value === "alone" ? [] : current.companionHealthConsents,
        companionTransportChoices: value === "no" || value === "alone" ? [] : current.companionTransportChoices,
        companionTransportModes: value === "no" || value === "alone" ? [] : current.companionTransportModes,
        companionTransportTimes: value === "no" || value === "alone" ? [] : current.companionTransportTimes,
        companionTransportPlaces: value === "no" || value === "alone" ? [] : current.companionTransportPlaces,
      }));
      return;
    }
    if (field === "companionCount") {
      const count = Math.max(0, Math.min(10, Number(value) || 0));
      setRsvpForm((current) => {
        const names = current.companionNames.slice(0, count);
        const menus = current.companionMenus.slice(0, count);
        const allergies = current.companionAllergies.slice(0, count);
        const allergiesOther = current.companionAllergiesOther.slice(0, count);
        const birthDates = current.companionBirthDates.slice(0, count);
        const parentalConsents = current.companionParentalConsents.slice(0, count);
        const healthConsents = current.companionHealthConsents.slice(0, count);
        const transportChoices = current.companionTransportChoices.slice(0, count);
        const transportModes = current.companionTransportModes.slice(0, count);
        const transportTimes = current.companionTransportTimes.slice(0, count);
        const transportPlaces = current.companionTransportPlaces.slice(0, count);
        while (names.length < count) {
          names.push("");
          menus.push("");
          allergies.push([]);
          allergiesOther.push("");
          birthDates.push("");
          parentalConsents.push(false);
          healthConsents.push(false);
          transportChoices.push("own");
          transportModes.push("own");
          transportTimes.push("");
          transportPlaces.push("");
        }
        return { ...current, companionCount: count, companionNames: names, companionMenus: menus, companionAllergies: allergies, companionAllergiesOther: allergiesOther, companionBirthDates: birthDates, companionParentalConsents: parentalConsents, companionHealthConsents: healthConsents, companionTransportChoices: transportChoices, companionTransportModes: transportModes, companionTransportTimes: transportTimes, companionTransportPlaces: transportPlaces };
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
    if (field.startsWith("companionTransportChoices[")) {
      const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
      setRsvpForm((current) => {
        const choices = [...current.companionTransportChoices];
        choices[idx] = String(value);
        return { ...current, companionTransportChoices: choices };
      });
      return;
    }
    if (field.startsWith("companionTransportModes[")) {
      const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
      setRsvpForm((current) => {
        const modes = [...current.companionTransportModes];
        modes[idx] = String(value);
        return { ...current, companionTransportModes: modes };
      });
      return;
    }
    if (field.startsWith("companionTransportTimes[")) {
      const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
      setRsvpForm((current) => {
        const times = [...current.companionTransportTimes];
        times[idx] = String(value);
        return { ...current, companionTransportTimes: times };
      });
      return;
    }
    if (field.startsWith("companionTransportPlaces[")) {
      const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
      setRsvpForm((current) => {
        const places = [...current.companionTransportPlaces];
        places[idx] = String(value);
        return { ...current, companionTransportPlaces: places };
      });
      return;
    }
    if (field === "guestName") {
      prefillRef.current = null;
    }
    setRsvpForm((current) => ({ ...current, [field]: value }));
  }, []);

  const validateRsvpData = useCallback((data: RsvpFormData) => {
    if (!data.guestName?.trim()) { return t("rsvp.validation.nameRequired"); }
    if (!isValidFullName(data.guestName)) { return t("rsvp.validation.nameFullRequired"); }
    if (data.attendance !== "no" && !data.birthDate) { return t("rsvp.validation.birthDateRequired"); }
    if (data.attendance === "with" && data.companionCount > 0) {
      for (let i = 0; i < data.companionCount; i++) {
        if (!data.companionNames[i]?.trim()) { return t("rsvp.validation.nameRequired"); }
        if (!isValidFullName(data.companionNames[i]!)) { return t("rsvp.validation.nameFullRequired"); }
        if (!data.companionBirthDates?.[i]) { return t("rsvp.validation.birthDateRequired"); }
        if (menuEnabled && !data.companionMenus?.[i]) { return t("rsvp.validation.menuRequired"); }
        const compAge = computeAge(data.companionBirthDates[i]!);
        if (compAge !== null && compAge < 14 && !data.companionParentalConsents?.[i]) { return t("rsvp.validation.ageUnder14"); }
        const hasCompAllergies = (data.companionAllergies?.[i] || []).length > 0
          || (data.companionAllergiesOther?.[i] || "").trim().length > 0;
        if (hasCompAllergies && !data.companionHealthConsents?.[i]) { return t("rsvp.validation.healthConsentRequired"); }
      }
    }
    if (data.attendance !== "no" && menuEnabled && !data.menuSelection) { return t("rsvp.validation.menuRequired"); }
    if (!data.privacyConsent) { return t("rsvp.validation.privacyRequired"); }
    if (data.attendance !== "no") {
      const age = computeAge(data.birthDate);
      if (age !== null && age < 14 && !data.parentalConsent) { return t("rsvp.validation.ageUnder14"); }
      // Las alergias del campo libre (allergiesOther) también son datos de
      // salud: requieren consentimiento explícito (GDPR art. 9).
      const hasHealthData = (data.allergies && data.allergies.length > 0)
        || (data.allergiesOther || "").trim().length > 0;
      if (hasHealthData && !data.healthConsent) { return t("rsvp.validation.healthConsentRequired"); }
    }

    return null;
  }, [t, menuEnabled]);

  const submitRsvpData = useCallback(async (data: RsvpFormData) => {

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
    const age = computeAge(form.birthDate);
    const single = form.guestName.trim();
    const now = new Date().toISOString();
    const isAttending = form.attendance !== "no";
    const companionCount = form.companionCount || 0;
    const nowTimestamp = serverTimestamp();

    const mainGuestId = doc(rsvpByInviteRef(inviteToken)).id;
    const mainGuestData = buildMainGuestData({
      data: form,
      isAttending,
      companionCount,
      single,
      encryptedDietaryInfo,
      age,
      inviteToken,
      nowTimestamp,
    });

    // Create companion docs with individual dietaryInfo
    const companionDocIds: string[] = [];
    const companionPayloads: Array<Record<string, unknown>> = [];
    for (let i = 0; i < companionCount; i++) {
      companionDocIds.push(doc(rsvpByInviteRef(inviteToken)).id);
      const compAllergies = form.companionAllergies[i] || [];
      const compDietaryInfo = compAllergies.filter(Boolean).join(" | ");
      const encCompDietary = await encrypt(compDietaryInfo, inviteToken);
      const compBirthDate = form.companionBirthDates?.[i] || "";
      const compAge = computeAge(compBirthDate);
      const companionData = buildCompanionData({
        data: form,
        i,
        single,
        mainGuestId,
        encCompDietary,
        compBirthDate,
        compAge,
        nowTimestamp,
        inviteToken,
      });
      companionPayloads.push(companionData);
    }

    mainGuestData.companionDocIds = companionDocIds;

    try {

      // Contador por invitación: el documento grupo rsvpResponses/{inviteToken}
      // guarda el contador (las reglas exigen que exista y esté por debajo de
      // 500) y se incrementa en el mismo lote para mantener el tope anti-spam.
      const counterRef = doc(db, "rsvpResponses", inviteToken);
      try {
        const counterSnap = await getDoc(counterRef);
        if (!counterSnap.exists()) {
          await setDoc(counterRef, { count: 0 });
        }
      } catch (counterErr) {
        console.error("[app]", "[useRsvp]", "RSVP counter setup failed", { error: counterErr });
      }

      const batch = writeBatch(db);
      batch.set(rsvpResponseRef(inviteToken, mainGuestId), mainGuestData);
      for (let i = 0; i < companionCount; i++) {
        batch.set(rsvpResponseRef(inviteToken, companionDocIds[i]!), companionPayloads[i]);
      }
      // Incremento atómico: dos invitados a la vez ya no pisan el contador
      // (el set con un valor leído perdía un envío completo por carrera).
      batch.update(counterRef, { count: increment(1) });
      await batch.commit();

    } catch (err) {
      console.error("[app]", "[useRsvp]", "RSVP batch write failed:", err);
      throw new Error(t("rsvp.saveError"));
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
      isAttending
        ? t("rsvp.successAttending", { name: single })
        : t("rsvp.successNotAttending", { name: single }),
    );
    // Analítica del envío (solo si hay consentimiento).
    try {
      const { trackEvent } = await import("../lib/analytics");
      trackEvent("rsvp_submit", { attendance: isAttending ? "yes" : "no" });
    } catch { }
    setRsvpForm(RsvpFormDefault());
    setHasSubmitted(true);
    setAlreadySubmittedEntry(null);
    prefillRef.current = null;
    // Invalida la caché para que la próxima visita refleje el nuevo estado.
    try { sessionStorage.removeItem(STORAGE_KEYS.rsvpCache(inviteToken)); } catch { }
  }, [inviteToken, t]);

  const { submitting, submitError, handleSubmit: submitViaHook } = useRsvpSubmit({
    token: inviteToken,
    onSubmit: submitRsvpData as unknown as (data: Record<string, unknown>) => Promise<void>,
    validate: validateRsvpData as unknown as (data: Record<string, unknown>) => string | null,
  });

  const isRsvpSubmitting = submitting;
  const feedbackMessage = submitError || rsvpMessage;

  const handleRsvpSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    if (submitting) return;
    submitViaHook(rsvpForm as unknown as Record<string, unknown>);
  }, [submitting, submitViaHook, rsvpForm]);

  const handleDeleteRsvp = useCallback(async () => {

    if (!alreadySubmittedEntry?.id) return;
    if (!window.confirm(t("rsvp.withdrawConfirm"))) { return; }
    try {
      const batch = writeBatch(db);
      batch.delete(rsvpResponseRef(inviteToken, alreadySubmittedEntry.id));
      for (const cid of alreadySubmittedEntry.companionDocIds || []) {
        batch.delete(rsvpResponseRef(inviteToken, cid));
      }
      // Retirar libera un hueco del tope anti-spam (increment -1).
      batch.update(doc(db, "rsvpResponses", inviteToken), { count: increment(-1) });
      await batch.commit();
      const idsToRemove = new Set([alreadySubmittedEntry.id, ...(alreadySubmittedEntry.companionDocIds || [])]);
      setRsvpEntries((current) => current.filter((e) => !idsToRemove.has(e.id)));
      setRsvpMessage(t("rsvp.withdrawSuccess"));
      setRsvpForm(RsvpFormDefault());
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      setHasSubmitted(false);
      try { sessionStorage.removeItem(STORAGE_KEYS.rsvpCache(inviteToken)); } catch { }

    } catch (err) {
      console.error("[app]", "[useRsvp]", "withdraw error", { error: err });
      setRsvpMessage(t("rsvp.withdrawError"));
    }
  }, [alreadySubmittedEntry, t, inviteToken]);

  const handleDeleteRsvpEntries = useCallback(async (ids: string[]) => {

    if (!ids.length) return;
    if (!window.confirm(t("attendance.deleteSelectedConfirm", { count: ids.length }))) { return; }
    try {
      const batch = writeBatch(db);
      for (const id of ids) {
        batch.delete(rsvpResponseRef(inviteToken, id));
      }
      batch.update(doc(db, "rsvpResponses", inviteToken), { count: increment(-ids.length) });
      await batch.commit();
      setRsvpEntries((current) => current.filter((e) => !ids.includes(e.id)));
      setAdminMessage(t("attendance.deleteSelectedSuccess", { count: ids.length }));
      setAdminMessageType("success");

    } catch (err) {
      console.error("[app]", "[useRsvp]", "delete selected error", { error: err });
      setAdminMessage(t("attendance.deleteSelectedError"));
      setAdminMessageType("error");
    }
  }, [setAdminMessage, setAdminMessageType, t, inviteToken]);

  const handleClearRsvpEntries = useCallback(async () => {

    if (!window.confirm(t("rsvp.clearConfirm"))) { return; }
    try {
      const snapshot = await getDocs(rsvpByInviteRef(inviteToken));

      await Promise.all(snapshot.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));
      await updateDoc(doc(db, "rsvpResponses", inviteToken), { count: increment(-snapshot.size) });
      setRsvpEntries([]);
      setAdminMessage(t("rsvp.clearSuccess"));
      setAdminMessageType("success");
      try { sessionStorage.removeItem(STORAGE_KEYS.rsvpCache(inviteToken)); } catch { }

    } catch (err) {
      console.error("[app]", "[useRsvp]", "clear error", { error: err });
      setAdminMessage(t("rsvp.clearError"));
      setAdminMessageType("error");
    }
  }, [inviteToken, setAdminMessage, setAdminMessageType, t]);

  // Memoizado: un objeto literal nuevo en cada render invalidaba el value del
  // AppContext (que depende de este objeto) y re-renderizaba a todos los
  // consumidores de useApp() con cada tecla del formulario RSVP.
  return useMemo(() => ({
    rsvpEntries, rsvpForm, rsvpMessage: feedbackMessage, isRsvpSubmitting, hasSubmitted,
    alreadySubmittedEntry, rsvpLoadError, retryLoadRsvp,
    updateRsvpField, handleRsvpSubmit, handleDeleteRsvpEntries, handleClearRsvpEntries, handleDeleteRsvp,
    DIETARY_OPTIONS,
    setRsvpMessage, setRsvpForm, computeAge,
  }), [
    rsvpEntries, rsvpForm, feedbackMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,
    rsvpLoadError, retryLoadRsvp,
    updateRsvpField, handleRsvpSubmit, handleDeleteRsvpEntries, handleClearRsvpEntries, handleDeleteRsvp,
    setRsvpMessage, setRsvpForm,
  ]);
}
