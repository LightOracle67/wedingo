import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDoc, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { RSVP_COLLECTION_REF, rsvpByInviteRef } from "../lib/firebase";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { computeAge } from "../lib/date-utils";
import { DIETARY_OPTIONS, parseDietaryInfo } from "../lib/rsvp-utils";

function legacyToAttendees(entry) {
  const parsed = parseDietaryInfo(entry.dietaryInfo || "", !!entry.mealChoice);
  const allergies = [...parsed.dietarySelection];
  if (parsed.dietaryOther && !allergies.includes(parsed.dietaryOther)) {
    allergies.push(parsed.dietaryOther);
  }

  const attendees = [];
  const names = (entry.guestNames || "").split(",").map((n) => n.trim()).filter(Boolean);

  attendees.push({
    name: entry.guestName || "",
    menu: entry.mealChoice || "",
    allergies: [...allergies],
  });

  names.forEach((name) => {
    attendees.push({
      name,
      menu: "",
      allergies: [...allergies],
    });
  });

  return attendees;
}

export function useRsvp(inviteToken, setAdminMessage, setAdminMessageType, menuEnabled) {
  const { t } = useTranslation();
  const [rsvpEntries, setRsvpEntries] = useState([]);
  const [rsvpForm, setRsvpForm] = useState({
    guestName: "",
    attendance: "yes",
    attendees: [{ name: "", menu: "", allergies: [] }],

    privacyConsent: false,
    healthConsent: false,
    birthDate: "",
    parentalConsent: false,
  });
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [alreadySubmittedEntry, setAlreadySubmittedEntry] = useState(null);
  const rsvpSubmitTimeoutRef = useRef(null);
  const prefillRef = useRef(null);

  useEffect(() => {
    const timeout = rsvpSubmitTimeoutRef.current;
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

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
        if (!cancelled) setRsvpEntries([]);
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
        setRsvpForm((current) => ({
          ...current,
          attendance: match.attendance,
          attendees: match.attendees || [],
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

  const updateRsvpField = useCallback((field, value) => {
    if (field === "attendance") {
      setRsvpForm((current) => ({
        ...current,
        attendance: value,
        attendees: value === "no" ? [] : (current.attendees?.length ? current.attendees : [{ name: "", menu: "", allergies: [] }]),
      }));
      return;
    }
    if (field === "guestName") {
      prefillRef.current = null;
    }
    setRsvpForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleRsvpSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (isRsvpSubmitting) return;

      const single = rsvpForm.guestName.trim();
      if (!single) {
        setRsvpMessage(t("rsvp.validation.nameRequired"));
        return;
      }

      if (rsvpForm.attendance === "yes" && !rsvpForm.birthDate) {
        setRsvpMessage(t("rsvp.validation.birthDateRequired"));
        return;
      }

      if (rsvpForm.attendance === "yes") {
        const invalidAttendee = rsvpForm.attendees.find((a) => !a.name.trim());
        if (invalidAttendee) {
          setRsvpMessage(t("rsvp.validation.nameRequired"));
          return;
        }
      }

      if (rsvpForm.attendance === "yes" && menuEnabled) {
        const missingMenu = rsvpForm.attendees.find((a) => !a.menu);
        if (missingMenu) {
          setRsvpMessage(t("rsvp.validation.menuHeadcountRequired"));
          return;
        }
      }

      if (!rsvpForm.privacyConsent) {
        setRsvpMessage(t("rsvp.validation.privacyRequired"));
        return;
      }

      if (!rsvpForm.birthDate) {
        setRsvpMessage(t("rsvp.validation.birthDateRequired"));
        return;
      }

      const age = computeAge(rsvpForm.birthDate);
      if (age !== null && age < 14 && !rsvpForm.parentalConsent) {
        setRsvpMessage(t("rsvp.validation.ageUnder14"));
        return;
      }

      if (rsvpForm.attendance === "yes") {
        const hasHealthData = rsvpForm.attendees.some((a) => a.allergies && a.allergies.length > 0);
        if (hasHealthData && !rsvpForm.healthConsent) {
          setRsvpMessage(t("rsvp.validation.healthConsentRequired"));
          return;
        }
      }

      const allAllergies = rsvpForm.attendees.flatMap((a) => a.allergies || []);
      const dietaryInfo = allAllergies.filter(Boolean).join(" | ");

      setIsRsvpSubmitting(true);
      const now = new Date().toISOString();
      try {
        const encryptedDietaryInfo = await encrypt(dietaryInfo, inviteToken);
        const payload = {
          guestName: single,
          attendance: rsvpForm.attendance,
          attendees: rsvpForm.attendees.map((a) => ({
            name: a.name,
            menu: a.menu || "",
            allergies: a.allergies || [],
          })),
          dietaryInfo: encryptedDietaryInfo,
          inviteToken,
          submittedAt: serverTimestamp(),
          privacyConsent: true,
          privacyConsentAt: serverTimestamp(),
        };
        if (rsvpForm.birthDate) {
          payload.birthDate = rsvpForm.birthDate;
        }
        if (age !== null && age < 14) {
          payload.parentalConsent = true;
        }
        if (rsvpForm.healthConsent) {
          payload.healthConsent = true;
          payload.healthConsentAt = serverTimestamp();
        }
        const docRef = await addDoc(RSVP_COLLECTION_REF, payload);
        setRsvpEntries((current) => [
          { ...payload, id: docRef.id, submittedAt: now, dietaryInfo },
          ...current,
        ]);
        setRsvpMessage(
          rsvpForm.attendance === "yes"
            ? t("rsvp.successAttending", { name: single })
            : t("rsvp.successNotAttending", { name: single }),
        );
        setRsvpForm({
          guestName: "", attendance: "yes", attendees: [{ name: "", menu: "", allergies: [] }], dietaryOther: "",
          privacyConsent: false, healthConsent: false,
          birthDate: "", parentalConsent: false,
        });
        setHasSubmitted(true);
        setAlreadySubmittedEntry(null);
        prefillRef.current = null;
      } catch {
        setRsvpMessage(t("rsvp.saveError"));
      } finally {
        setIsRsvpSubmitting(false);
      }
    },
    [isRsvpSubmitting, rsvpForm, inviteToken, menuEnabled, t],
  );

  const handleDeleteRsvp = useCallback(async () => {
    if (!alreadySubmittedEntry?.id) return;
    if (!window.confirm(t("rsvp.withdrawConfirm"))) return;
    try {
      await deleteDoc(doc(RSVP_COLLECTION_REF, alreadySubmittedEntry.id));
      setRsvpEntries((current) => current.filter((e) => e.id !== alreadySubmittedEntry.id));
      setRsvpMessage(t("rsvp.withdrawSuccess"));
        setRsvpForm({
          guestName: "", attendance: "yes", attendees: [{ name: "", menu: "", allergies: [] }],
          privacyConsent: false, healthConsent: false,
          birthDate: "", parentalConsent: false,
        });
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
    rsvpEntries, rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    alreadySubmittedEntry,
    updateRsvpField, handleRsvpSubmit, handleClearRsvpEntries, handleDeleteRsvp,
    handleDietaryToggle, DIETARY_OPTIONS,
    setRsvpMessage, setRsvpForm, computeAge,
  };
}
