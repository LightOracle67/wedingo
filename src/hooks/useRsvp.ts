import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDoc, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { RSVP_COLLECTION_REF, rsvpByInviteRef } from "../lib/firebase";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { computeAge } from "../lib/date-utils";
import { DIETARY_OPTIONS, parseDietaryInfo } from "../lib/rsvp-utils";
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
  menuSelection: string;
  allergies: string[];
  allergiesOther: string;
  privacyConsent: boolean;
  healthConsent: boolean;
  birthDate: string;
  parentalConsent: boolean;
}

interface RsvpEntryData {
  id: string;
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
    menuSelection: "",
    allergies: [],
    allergiesOther: "",
    privacyConsent: false,
    healthConsent: false,
    birthDate: "",
    parentalConsent: false,
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
    let cancelled = false;
    const hydrateRsvp = async () => {
      if (!inviteToken) return;
      try {
        const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
        if (cancelled) return;
        const entries = (
          await Promise.all(
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
              };
            }),
          )
        ).sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        );
        if (!cancelled) setRsvpEntries(entries);
      } catch {
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
  }, [inviteToken]);

  useEffect(() => {
    const name = rsvpForm.guestName.trim().toLowerCase();
    if (!name) {
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      return;
    }
    const match = rsvpEntries.find((e) => e.guestName.trim().toLowerCase() === name) || null;
    if (match) {
      if (match.id !== prefillRef.current) {
        prefillRef.current = match.id;
        setAlreadySubmittedEntry(match);
        const companionCount = match.companionCount || Math.max(0, (match.attendees?.length || 1) - 1);
        const companionNames = match.companionNames?.length
          ? match.companionNames
          : (match.attendees?.slice(1).map((a: Attendee) => a.name) || []);
        const companionMenus = match.companionMenus?.length
          ? match.companionMenus
          : (match.attendees?.slice(1).map((a: Attendee) => a.menu || "") || []);
        const companionAllergies = match.companionAllergies?.length
          ? match.companionAllergies
          : (match.attendees?.slice(1).map((a: Attendee) => [...(a.allergies || [])]) || []);
        setRsvpForm((current) => ({
          ...current,
          attendance: companionCount > 0 ? "with" : "alone",
          companionCount,
          companionNames: companionNames.length ? companionNames : [],
          companionMenus: companionMenus.length ? companionMenus : [],
          companionAllergies: companionAllergies.length ? companionAllergies : [],
          menuSelection: match.mealChoice || "",
        }));
      } else {
        setAlreadySubmittedEntry(match);
      }
    } else {
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
    }
  }, [rsvpForm.guestName, rsvpEntries]);

  const handleDietaryToggle = useCallback(() => {}, []);

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
        while (names.length < count) {
          names.push("");
          menus.push("");
          allergies.push([]);
          allergiesOther.push("");
        }
        return { ...current, companionCount: count, companionNames: names, companionMenus: menus, companionAllergies: allergies, companionAllergiesOther: allergiesOther };
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

  const validateRsvpData = useCallback((data: RsvpFormData) => {
    if (!data.guestName?.trim()) return t("rsvp.validation.nameRequired");
    if (data.attendance !== "no" && !data.birthDate) return t("rsvp.validation.birthDateRequired");
    if (data.attendance === "with" && data.companionCount > 0) {
      const hasEmptyName = data.companionNames.slice(0, data.companionCount).some((n) => !n.trim());
      if (hasEmptyName) return t("rsvp.validation.nameRequired");
    }
    if (data.attendance !== "no" && menuEnabled && !data.menuSelection) return t("rsvp.validation.menuRequired");
    if (!data.privacyConsent) return t("rsvp.validation.privacyRequired");
    if (data.attendance !== "no") {
      const age = computeAge(data.birthDate);
      if (age !== null && age < 14 && !data.parentalConsent) return t("rsvp.validation.ageUnder14");
      const hasHealthData = data.allergies && data.allergies.length > 0;
      if (hasHealthData && !data.healthConsent) return t("rsvp.validation.healthConsentRequired");
    }
    return null;
  }, [t, menuEnabled]);

  const submitRsvpData = useCallback(async (data: RsvpFormData) => {
    const allergies = data.allergies || [];
    const dietaryInfo = allergies.filter(Boolean).join(" | ");
    const encryptedDietaryInfo = await encrypt(dietaryInfo, inviteToken);
    const age = computeAge(data.birthDate);
    const single = data.guestName.trim();
    const now = new Date().toISOString();
    const isAttending = data.attendance !== "no";
    const payload: Record<string, unknown> = {
      guestName: single,
      attendance: isAttending ? "yes" : "no",
      companionCount: data.companionCount || 0,
      companionNames: data.companionNames.slice(0, data.companionCount || 0),
      companionMenus: data.companionMenus.slice(0, data.companionCount || 0),
      companionAllergies: data.companionAllergies.slice(0, data.companionCount || 0).map((a) => [...a]),
      companionAllergiesOther: (data.companionAllergiesOther || []).slice(0, data.companionCount || 0),
      allergiesOther: data.allergiesOther || "",
      dietaryInfo: encryptedDietaryInfo,
      inviteToken,
      submittedAt: serverTimestamp(),
      privacyConsent: true,
      privacyConsentAt: serverTimestamp(),
    };
    if (data.menuSelection) payload.mealChoice = data.menuSelection;
    if (data.birthDate) payload.birthDate = data.birthDate;
    if (age !== null && age < 14) payload.parentalConsent = true;
    if (data.healthConsent) {
      payload.healthConsent = true;
      payload.healthConsentAt = serverTimestamp();
    }
    let docRef;
    try {
      docRef = await addDoc(RSVP_COLLECTION_REF, payload);
    } catch {
      throw new Error(t("rsvp.saveError"));
    }
    setRsvpEntries((current) => [
      { ...(payload as unknown as RsvpEntryData), id: docRef.id, submittedAt: now, dietaryInfo },
      ...current,
    ]);
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
    if (submitting) return;
    submitViaHook(rsvpForm as unknown as Record<string, unknown>);
  }, [submitting, submitViaHook, rsvpForm]);

  const handleDeleteRsvp = useCallback(async () => {
    if (!alreadySubmittedEntry?.id) return;
    if (!window.confirm(t("rsvp.withdrawConfirm"))) return;
    try {
      await deleteDoc(doc(RSVP_COLLECTION_REF, alreadySubmittedEntry.id));
      setRsvpEntries((current) => current.filter((e) => e.id !== alreadySubmittedEntry.id));
      setRsvpMessage(t("rsvp.withdrawSuccess"));
        setRsvpForm(RsvpFormDefault());
        setAlreadySubmittedEntry(null);
        prefillRef.current = null;
      setHasSubmitted(false);
    } catch {
      setRsvpMessage(t("rsvp.withdrawError"));
    }
  }, [alreadySubmittedEntry, t]);

  const handleClearRsvpEntries = useCallback(async () => {
    if (!window.confirm(t("rsvp.clearConfirm"))) return;
    try {
      const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
      await Promise.all(snapshot.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));
      setRsvpEntries([]);
      setAdminMessage(t("rsvp.clearSuccess"));
      setAdminMessageType("success");
    } catch {
      setAdminMessage(t("rsvp.clearError"));
      setAdminMessageType("error");
    }
  }, [inviteToken, setAdminMessage, setAdminMessageType, t]);

  return {
    rsvpEntries, rsvpForm, rsvpMessage: feedbackMessage, isRsvpSubmitting, hasSubmitted,
    alreadySubmittedEntry,
    updateRsvpField, handleRsvpSubmit, handleClearRsvpEntries, handleDeleteRsvp,
    handleDietaryToggle, DIETARY_OPTIONS,
    setRsvpMessage, setRsvpForm, computeAge,
  };
}
