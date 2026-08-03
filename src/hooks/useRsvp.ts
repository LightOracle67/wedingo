import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { writeBatch, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { db, RSVP_COLLECTION_REF, rsvpByInviteRef } from "../lib/firebase";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { computeAge } from "../lib/date-utils";
import { DIETARY_OPTIONS, parseDietaryInfo } from "../lib/rsvp-utils";
import { isValidFullName, normalizeFullName } from "../lib/name-utils";
import { useRsvpSubmit } from "./useRsvpSubmit";
import type { Attendee } from "../types";

interface LegacyEntry {
  guestName: string;
  mealChoice: string;
  guestNames: string;
  dietaryInfo: string;
}

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
  menuSelection: string;
  allergies: string[];
  allergiesOther: string;
  privacyConsent: boolean;
  healthConsent: boolean;
  birthDate: string;
  parentalConsent: boolean;
  transportChoice: string;
  transportMode: string;
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
  menuHeadcounts: Record<string, number>;
  guestNames: string;
  note: string;
  submittedAt: string;
  birthDate?: string;
  parentalConsent?: boolean;
  healthConsent?: boolean;
  transportChoice?: string;
  transportMode?: string;
  companionTransportChoices?: string[];
  companionTransportModes?: string[];
  companionDocIds?: string[];
  mainGuestDocId?: string;
  mainGuestName?: string;
}

function legacyToAttendees(entry: LegacyEntry) {
  const parsed = parseDietaryInfo(entry.dietaryInfo || "", !!entry.mealChoice);
  const allergies = [...parsed.dietarySelection];
  if (parsed.dietaryOther && !allergies.includes(parsed.dietaryOther)) {
    allergies.push(parsed.dietaryOther);
  }

  const attendees: Attendee[] = [];
  const names = (entry.guestNames || "").split(",").map((n: string) => n.trim()).filter(Boolean);

  attendees.push({
    name: entry.guestName || "",
    menu: (entry.mealChoice || "") as Attendee["menu"],
    allergies: [...allergies],
  });

  names.forEach((name: string) => {
    attendees.push({
      name,
      menu: "",
      allergies: [...allergies],
    });
  });

  return attendees;
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
    menuSelection: "",
    allergies: [],
    allergiesOther: "",
    privacyConsent: false,
    healthConsent: false,
    birthDate: "",
    parentalConsent: false,
    transportChoice: "own",
    transportMode: "own",
  };
}

export function useRsvp(
  inviteToken: string,
  setAdminMessage: (msg: string) => void,
  setAdminMessageType: (type: string) => void,
  menuEnabled: boolean,
) {
  const { t } = useTranslation();
  const [rsvpEntries, setRsvpEntries] = useState<RsvpEntryData[]>([]);
  const [rsvpForm, setRsvpForm] = useState<RsvpFormData>(RsvpFormDefault());
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [alreadySubmittedEntry, setAlreadySubmittedEntry] = useState<RsvpEntryData | null>(null);
  const prefillRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("[app]", "[useRsvp]", "hydrate effect", { inviteToken });
    let cancelled = false;
    const hydrateRsvp = async () => {
      if (!inviteToken) { console.log("[app]", "[useRsvp]", "no inviteToken, skip", {}); return; }
      console.log("[app]", "[useRsvp]", "hydrate start", {});
      try {
        const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
        console.log("[app]", "[useRsvp]", "raw docs count", { count: snapshot.docs.length });
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

            let attendees = data.attendees || [];
            if (!attendees.length && Number.isFinite(data.companions) && data.companions >= 0) {
              const legacyEntry = {
                guestName: data.guestName || "",
                mealChoice: data.mealChoice || "",
                guestNames: data.guestNames || "",
                dietaryInfo: decryptedDietaryInfo,
              };
              attendees = legacyToAttendees(legacyEntry);
            }

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
                menuHeadcounts: data.menuHeadcounts || {},
                guestNames: data.guestNames || "",
                note: data.note || "",
                submittedAt,
                birthDate: data.birthDate || "",
                parentalConsent: data.parentalConsent || false,
                healthConsent: data.healthConsent || false,
                transportChoice: data.transportChoice || "",
                transportMode: data.transportMode || "",
                companionTransportChoices: data.companionTransportChoices || [],
                companionTransportModes: data.companionTransportModes || [],
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
            main.companionAllergies = linkedCompanions.map((c) => {
              const parsed = parseDietaryInfo(c.dietaryInfo, !!c.mealChoice);
              return [...parsed.dietarySelection, ...(parsed.dietaryOther ? [parsed.dietaryOther] : [])];
            });
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
          console.log("[app]", "[useRsvp]", "hydrate success", { totalEntries: entries.length, mainCount: mainEntries.length, companionCount: companionAsEntries.length });
          setRsvpEntries(entries);
        }
      } catch (err) {
        console.error("[app]", "[useRsvp]", "hydrate error", { error: err });
        if (!cancelled) {
          setRsvpEntries([]);
          setAdminMessageType("error");
          setAdminMessage(t("rsvp.saveError"));
        }
      }
    };
    hydrateRsvp();
    return () => {
      cancelled = true;
    };
  }, [inviteToken, t, setAdminMessage, setAdminMessageType]);

  useEffect(() => {
    const name = rsvpForm.guestName.trim().toLowerCase();
    console.log("[app]", "[useRsvp]", "prefill effect", { name, entryCount: rsvpEntries.length });
    if (!name) {
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      return;
    }
    const match = rsvpEntries.find((e) => e.guestName.trim().toLowerCase() === name) || null;
    console.log("[app]", "[useRsvp]", "prefill match result", { found: !!match, type: match?.rsvpType, matchId: match?.id, prefillId: prefillRef.current });

    if (match && match.rsvpType === "companion") {
      if (match.id !== prefillRef.current) {
        console.log("[app]", "[useRsvp]", "prefill companion match (new)", { id: match.id });
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
          menuSelection: match.mealChoice || "",
          birthDate: match.birthDate || "",
          allergies: parsed.dietarySelection,
          allergiesOther: parsed.dietaryOther || match.allergiesOther || "",
          privacyConsent: true,
          healthConsent: match.healthConsent || false,
          parentalConsent: match.parentalConsent || false,
          transportChoice: match.transportChoice || "own",
          transportMode: match.transportMode || "own",
        }));
      } else {
        console.log("[app]", "[useRsvp]", "prefill companion match (already set)", {});
        setAlreadySubmittedEntry(match);
      }
      return;
    }

    if (match) {
      if (match.id !== prefillRef.current) {
        console.log("[app]", "[useRsvp]", "prefill main match (new)", { id: match.id, companionCount: match.companionNames?.length });
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
          companionBirthDates,
          companionParentalConsents,
          companionHealthConsents,
          companionTransportChoices: match.companionTransportChoices || [],
          companionTransportModes: match.companionTransportModes || [],
          menuSelection: match.mealChoice || "",
          birthDate: match.birthDate || "",
          allergies: parsed.dietarySelection,
          allergiesOther: parsed.dietaryOther || match.allergiesOther || "",
          privacyConsent: true,
          healthConsent: match.healthConsent || false,
          parentalConsent: match.parentalConsent || false,
          transportChoice: match.transportChoice || "own",
          transportMode: match.transportMode || "own",
        }));
      } else {
        console.log("[app]", "[useRsvp]", "prefill main match (already set)", {});
        setAlreadySubmittedEntry(match);
      }
    } else {
      console.log("[app]", "[useRsvp]", "no prefill match, clearing", {});
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
    }
  }, [rsvpForm.guestName, rsvpEntries]);

  const handleDietaryToggle = useCallback(() => {}, []);

  const updateRsvpField = useCallback((field: string, value: unknown) => {
    console.log("[app]", "[useRsvp]", "updateRsvpField", { field, value });
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
      }));
      return;
    }
    if (field === "companionCount") {
      const count = Math.max(0, Math.min(10, Number(value) || 0));
      setRsvpForm((current) => {
        const names = current.companionNames.slice(0, count);
        const menus = current.companionMenus.slice(0, count);
        const allergies = current.companionAllergies.slice(0, count);
        const allergiesOther = (current.companionAllergiesOther || []).slice(0, count);
        const birthDates = (current.companionBirthDates || []).slice(0, count);
        const parentalConsents = (current.companionParentalConsents || []).slice(0, count);
        const healthConsents = (current.companionHealthConsents || []).slice(0, count);
        const transportChoices = (current.companionTransportChoices || []).slice(0, count);
        const transportModes = (current.companionTransportModes || []).slice(0, count);
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
        }
        return { ...current, companionCount: count, companionNames: names, companionMenus: menus, companionAllergies: allergies, companionAllergiesOther: allergiesOther, companionBirthDates: birthDates, companionParentalConsents: parentalConsents, companionHealthConsents: healthConsents, companionTransportChoices: transportChoices, companionTransportModes: transportModes };
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
    if (field === "guestName") {
      prefillRef.current = null;
    }
    setRsvpForm((current) => ({ ...current, [field]: value }));
  }, []);

  const validateRsvpData = useCallback((data: RsvpFormData) => {
    if (!data.guestName?.trim()) { console.log("[app]", "[useRsvp]", "validation fail: name required", {}); return t("rsvp.validation.nameRequired"); }
    if (!isValidFullName(data.guestName)) { console.log("[app]", "[useRsvp]", "validation fail: full name required", {}); return t("rsvp.validation.nameFullRequired"); }
    if (data.attendance !== "no" && !data.birthDate) { console.log("[app]", "[useRsvp]", "validation fail: birthDate required", {}); return t("rsvp.validation.birthDateRequired"); }
    if (data.attendance === "with" && data.companionCount > 0) {
      for (let i = 0; i < data.companionCount; i++) {
        if (!data.companionNames[i]?.trim()) { console.log("[app]", "[useRsvp]", "validation fail: companion name", { i }); return t("rsvp.validation.nameRequired"); }
        if (!isValidFullName(data.companionNames[i]!)) { console.log("[app]", "[useRsvp]", "validation fail: companion full name", { i }); return t("rsvp.validation.nameFullRequired"); }
        if (!data.companionBirthDates?.[i]) { console.log("[app]", "[useRsvp]", "validation fail: companion birthDate", { i }); return t("rsvp.validation.birthDateRequired"); }
        if (menuEnabled && !data.companionMenus?.[i]) { console.log("[app]", "[useRsvp]", "validation fail: companion menu", { i }); return t("rsvp.validation.menuRequired"); }
        const compAge = computeAge(data.companionBirthDates[i]!);
        if (compAge !== null && compAge < 14 && !data.companionParentalConsents?.[i]) { console.log("[app]", "[useRsvp]", "validation fail: companion parental consent", { i, age: compAge }); return t("rsvp.validation.ageUnder14"); }
        const hasCompAllergies = (data.companionAllergies?.[i] || []).length > 0
          || (data.companionAllergiesOther?.[i] || "").trim().length > 0;
        if (hasCompAllergies && !data.companionHealthConsents?.[i]) { console.log("[app]", "[useRsvp]", "validation fail: companion health consent", { i }); return t("rsvp.validation.healthConsentRequired"); }
      }
    }
    if (data.attendance !== "no" && menuEnabled && !data.menuSelection) { console.log("[app]", "[useRsvp]", "validation fail: menu required", {}); return t("rsvp.validation.menuRequired"); }
    if (!data.privacyConsent) { console.log("[app]", "[useRsvp]", "validation fail: privacy consent required", {}); return t("rsvp.validation.privacyRequired"); }
    if (data.attendance !== "no") {
      const age = computeAge(data.birthDate);
      if (age !== null && age < 14 && !data.parentalConsent) { console.log("[app]", "[useRsvp]", "validation fail: parental consent", { age }); return t("rsvp.validation.ageUnder14"); }
      const hasHealthData = data.allergies && data.allergies.length > 0;
      if (hasHealthData && !data.healthConsent) { console.log("[app]", "[useRsvp]", "validation fail: health consent", {}); return t("rsvp.validation.healthConsentRequired"); }
    }
    console.log("[app]", "[useRsvp]", "validation pass", {});
    return null;
  }, [t, menuEnabled]);

  const submitRsvpData = useCallback(async (data: RsvpFormData) => {
    console.log("[app]", "[useRsvp]", "submitRsvpData start", { guestName: data.guestName, attendance: data.attendance, companionCount: data.companionCount });
    const allergies = data.allergies || [];
    const dietaryInfo = allergies.filter(Boolean).join(" | ");
    data.guestName = normalizeFullName(data.guestName);
    data.companionNames = (data.companionNames || []).map(normalizeFullName);
    const encryptedDietaryInfo = await encrypt(dietaryInfo, inviteToken);
    const age = computeAge(data.birthDate);
    const single = data.guestName.trim();
    const now = new Date().toISOString();
    const isAttending = data.attendance !== "no";
    const companionCount = data.companionCount || 0;
    const nowTimestamp = serverTimestamp();

    const mainGuestId = doc(RSVP_COLLECTION_REF).id;
    const mainGuestData: Record<string, unknown> = {
      rsvpType: "main",
      guestName: single,
      attendance: isAttending ? "yes" : "no",
      companionCount,
      companionNames: data.companionNames.slice(0, companionCount),
      companionMenus: data.companionMenus.slice(0, companionCount),
      companionAllergies: data.companionAllergies.slice(0, companionCount).map((a) => a.join(" | ")),
      companionAllergiesOther: (data.companionAllergiesOther || []).slice(0, companionCount),
      allergiesOther: data.allergiesOther || "",
      dietaryInfo: encryptedDietaryInfo,
      inviteToken,
      submittedAt: nowTimestamp,
      privacyConsent: true,
      privacyConsentAt: nowTimestamp,
    };
    if (data.menuSelection) mainGuestData.mealChoice = data.menuSelection;
    if (data.birthDate) mainGuestData.birthDate = data.birthDate;
    if (age !== null && age < 14) mainGuestData.parentalConsent = true;
    if (data.healthConsent) {
      mainGuestData.healthConsent = true;
      mainGuestData.healthConsentAt = nowTimestamp;
    }
    if (isAttending && data.transportChoice) {
      mainGuestData.transportChoice = String(data.transportChoice).slice(0, 20);
    }
    if (isAttending && data.transportMode) {
      mainGuestData.transportMode = String(data.transportMode).slice(0, 10);
    }
    mainGuestData.companionTransportChoices = (data.companionTransportChoices || []).slice(0, companionCount);
    mainGuestData.companionTransportModes = (data.companionTransportModes || []).slice(0, companionCount);

    // Create companion docs with individual dietaryInfo
    const companionDocIds: string[] = [];
    const companionPayloads: Array<Record<string, unknown>> = [];
    for (let i = 0; i < companionCount; i++) {
      companionDocIds.push(doc(RSVP_COLLECTION_REF).id);
      const compAllergies = data.companionAllergies[i] || [];
      const compDietaryInfo = compAllergies.filter(Boolean).join(" | ");
      const encCompDietary = await encrypt(compDietaryInfo, inviteToken);
      const compBirthDate = data.companionBirthDates?.[i] || "";
      const compAge = computeAge(compBirthDate);
      const companionData: Record<string, unknown> = {
        rsvpType: "companion",
        guestName: (data.companionNames[i] || "").slice(0, 120),
        attendance: "yes",
        dietaryInfo: encCompDietary,
        inviteToken,
        submittedAt: nowTimestamp,
        privacyConsent: true,
        mainGuestDocId: mainGuestId,
        mainGuestName: single,
      };
      if (compBirthDate) companionData.birthDate = compBirthDate;
      if (compAge !== null && compAge < 14) companionData.parentalConsent = true;
      if (data.companionMenus[i]) companionData.mealChoice = data.companionMenus[i];
      if (data.companionTransportChoices?.[i]) {
        companionData.transportChoice = String(data.companionTransportChoices[i]).slice(0, 20);
      }
      if (data.companionTransportModes?.[i]) {
        companionData.transportMode = String(data.companionTransportModes[i]).slice(0, 10);
      }
      const hasCompDietary = compAllergies.length > 0 || (data.companionAllergiesOther[i] || "").trim();
      if (hasCompDietary) {
        companionData.healthConsent = true;
        companionData.healthConsentAt = nowTimestamp;
      }
      companionPayloads.push(companionData);
    }

    mainGuestData.companionDocIds = companionDocIds;

    try {
      console.log("[app]", "[useRsvp]", "writing batch with", { mainGuestId, companionCount });
      const batch = writeBatch(db);
      batch.set(doc(RSVP_COLLECTION_REF, mainGuestId), mainGuestData);
      for (let i = 0; i < companionCount; i++) {
        batch.set(doc(RSVP_COLLECTION_REF, companionDocIds[i]), companionPayloads[i]);
      }
      await batch.commit();
      console.log("[app]", "[useRsvp]", "batch commit success", {});
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
      menuHeadcounts: {},
      guestNames: "",
      note: "",
      submittedAt: now,
      transportChoice: (mainGuestData.transportChoice as string) || "",
      transportMode: (mainGuestData.transportMode as string) || "",
      companionTransportChoices: (mainGuestData.companionTransportChoices as string[]) || [],
      companionTransportModes: (mainGuestData.companionTransportModes as string[]) || [],
      companionDocIds,
    };

    console.log("[app]", "[useRsvp]", "submit success, updating state", { isAttending, name: single });
    setRsvpEntries((current) => [mainEntry, ...current]);
    setRsvpMessage(
      isAttending
        ? t("rsvp.successAttending", { name: single })
        : t("rsvp.successNotAttending", { name: single }),
    );
    setRsvpForm(RsvpFormDefault());
    setHasSubmitted(true);
    setAlreadySubmittedEntry(null);
    prefillRef.current = null;
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
    console.log("[app]", "[useRsvp]", "handleRsvpSubmit", { submitting });
    if (submitting) return;
    submitViaHook(rsvpForm as unknown as Record<string, unknown>);
  }, [submitting, submitViaHook, rsvpForm]);

  const handleDeleteRsvp = useCallback(async () => {
    console.log("[app]", "[useRsvp]", "handleDeleteRsvp start", { id: alreadySubmittedEntry?.id });
    if (!alreadySubmittedEntry?.id) return;
    if (!window.confirm(t("rsvp.withdrawConfirm"))) { console.log("[app]", "[useRsvp]", "withdraw cancelled by user", {}); return; }
    try {
      const batch = writeBatch(db);
      batch.delete(doc(RSVP_COLLECTION_REF, alreadySubmittedEntry.id));
      for (const cid of alreadySubmittedEntry.companionDocIds || []) {
        batch.delete(doc(RSVP_COLLECTION_REF, cid));
      }
      await batch.commit();
      const idsToRemove = new Set([alreadySubmittedEntry.id, ...(alreadySubmittedEntry.companionDocIds || [])]);
      setRsvpEntries((current) => current.filter((e) => !idsToRemove.has(e.id)));
      setRsvpMessage(t("rsvp.withdrawSuccess"));
      setRsvpForm(RsvpFormDefault());
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      setHasSubmitted(false);
      console.log("[app]", "[useRsvp]", "withdraw success", {});
    } catch (err) {
      console.error("[app]", "[useRsvp]", "withdraw error", { error: err });
      setRsvpMessage(t("rsvp.withdrawError"));
    }
  }, [alreadySubmittedEntry, t]);

  const handleDeleteRsvpEntries = useCallback(async (ids: string[]) => {
    console.log("[app]", "[useRsvp]", "handleDeleteRsvpEntries start", { count: ids.length });
    if (!ids.length) return;
    if (!window.confirm(t("attendance.deleteSelectedConfirm", { count: ids.length }))) { console.log("[app]", "[useRsvp]", "delete selected cancelled", {}); return; }
    try {
      const batch = writeBatch(db);
      for (const id of ids) {
        batch.delete(doc(RSVP_COLLECTION_REF, id));
      }
      await batch.commit();
      setRsvpEntries((current) => current.filter((e) => !ids.includes(e.id)));
      setAdminMessage(t("attendance.deleteSelectedSuccess", { count: ids.length }));
      setAdminMessageType("success");
      console.log("[app]", "[useRsvp]", "delete selected success", { count: ids.length });
    } catch (err) {
      console.error("[app]", "[useRsvp]", "delete selected error", { error: err });
      setAdminMessage(t("attendance.deleteSelectedError"));
      setAdminMessageType("error");
    }
  }, [setAdminMessage, setAdminMessageType, t]);

  const handleClearRsvpEntries = useCallback(async () => {
    console.log("[app]", "[useRsvp]", "handleClearRsvpEntries start", {});
    if (!window.confirm(t("rsvp.clearConfirm"))) { console.log("[app]", "[useRsvp]", "clear cancelled", {}); return; }
    try {
      const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
      console.log("[app]", "[useRsvp]", "clearing entries", { count: snapshot.docs.length });
      await Promise.all(snapshot.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));
      setRsvpEntries([]);
      setAdminMessage(t("rsvp.clearSuccess"));
      setAdminMessageType("success");
      console.log("[app]", "[useRsvp]", "clear success", {});
    } catch (err) {
      console.error("[app]", "[useRsvp]", "clear error", { error: err });
      setAdminMessage(t("rsvp.clearError"));
      setAdminMessageType("error");
    }
  }, [inviteToken, setAdminMessage, setAdminMessageType, t]);

  return {
    rsvpEntries, rsvpForm, rsvpMessage: feedbackMessage, isRsvpSubmitting, hasSubmitted,
    alreadySubmittedEntry,
    updateRsvpField, handleRsvpSubmit, handleDeleteRsvpEntries, handleClearRsvpEntries, handleDeleteRsvp,
    handleDietaryToggle, DIETARY_OPTIONS,
    setRsvpMessage, setRsvpForm, computeAge,
  };
}
