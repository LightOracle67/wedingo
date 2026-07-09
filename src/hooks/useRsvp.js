import { useCallback, useEffect, useRef, useState } from "react";
import { addDoc, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { RSVP_COLLECTION_REF, rsvpByInviteRef } from "../lib/firebase";
import { encrypt, decrypt } from "../lib/crypto-utils";

const DIETARY_OPTIONS = [
  { value: "sin gluten", label: "Sin gluten" },
  { value: "sin lactosa", label: "Sin lactosa" },
  { value: "alergia frutos secos", label: "Alergia a frutos secos" },
  { value: "alergia mariscos", label: "Alergia a mariscos" },
];

function computeAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function parseDietaryInfo(dietaryInfo, menuEnabled) {
  const parts = (dietaryInfo || "").split(" | ").filter(Boolean);
  let mealChoice = "";
  const dietarySelection = [];
  let dietaryOther = "";

  let startIdx = 0;
  if (menuEnabled && parts[0] && parts[0].startsWith("Menú: ")) {
    mealChoice = parts[0].slice("Menú: ".length);
    startIdx = 1;
  }

  for (let i = startIdx; i < parts.length; i++) {
    const part = parts[i];
    if (DIETARY_OPTIONS.some((opt) => opt.value === part)) {
      dietarySelection.push(part);
    } else {
      dietaryOther = part;
    }
  }

  return { mealChoice, dietarySelection, dietaryOther };
}

export function useRsvp(inviteToken, setAdminMessage, setAdminMessageType, menuEnabled) {
  const [rsvpEntries, setRsvpEntries] = useState([]);
  const [rsvpForm, setRsvpForm] = useState({
    guestName: "",
    attendance: "yes",
    mealChoice: "",
    dietarySelection: [],
    dietaryOther: "",
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
    const hydrateRsvp = async () => {
      if (!inviteToken) return;
      try {
        const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
        const entries = (await Promise.all(snapshot.docs
          .map(async (entryDoc) => {
            const data = entryDoc.data();
            const submittedAt = typeof data.submittedAt?.toDate === "function"
              ? data.submittedAt.toDate().toISOString()
              : typeof data.submittedAt === "string"
                ? data.submittedAt
                : data.submittedAt?.seconds
                  ? new Date(data.submittedAt.seconds * 1000).toISOString()
                  : new Date().toISOString();
            return {
              id: entryDoc.id,
              guestName: data.guestName || "",
              attendance: data.attendance || "no",
              companions: Number.isFinite(data.companions) ? data.companions : 0,
              dietaryInfo: typeof data.dietaryInfo === "string" ? await decrypt(data.dietaryInfo, inviteToken) : "",
              mealChoice: data.mealChoice || "",
              note: data.note || "",
              submittedAt,
            };
          })))
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setRsvpEntries(entries);
      } catch {
        setRsvpEntries([]);
      }
    };
    hydrateRsvp();
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
        const parsed = parseDietaryInfo(match.dietaryInfo || "", menuEnabled);
        setAlreadySubmittedEntry(match);
        setRsvpForm((current) => ({
          ...current,
          attendance: match.attendance,
          mealChoice: parsed.mealChoice,
          dietarySelection: parsed.dietarySelection,
          dietaryOther: parsed.dietaryOther,
        }));
      } else {
        setAlreadySubmittedEntry(match);
      }
    } else {
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
    }
  }, [rsvpForm.guestName, rsvpEntries, menuEnabled]);

  const handleDietaryToggle = useCallback((value) => {
    setRsvpForm((current) => {
      const exists = current.dietarySelection.includes(value);
      return {
        ...current,
        dietarySelection: exists
          ? current.dietarySelection.filter((v) => v !== value)
          : [...current.dietarySelection, value],
      };
    });
  }, []);

  const updateRsvpField = useCallback((field, value) => {
    if (field === "attendance") {
      setRsvpForm((current) => ({
        ...current,
        attendance: value,
        companions: value === "no" ? 0 : (current.companions ?? 0),
      }));
      return;
    }
    if (field === "guestName") {
      prefillRef.current = null;
    }
    setRsvpForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleRsvpSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (isRsvpSubmitting) return;

    const single = rsvpForm.guestName.trim();
    if (!single) {
      setRsvpMessage("Escribe tu nombre para confirmar la asistencia.");
      return;
    }

    if (menuEnabled && rsvpForm.attendance === "yes" && !rsvpForm.mealChoice) {
      setRsvpMessage("Selecciona una opción de menú.");
      return;
    }

    if (!rsvpForm.privacyConsent) {
      setRsvpMessage("Debes aceptar la Política de Privacidad.");
      return;
    }

    if (!rsvpForm.birthDate) {
      setRsvpMessage("Debes indicar tu fecha de nacimiento.");
      return;
    }

    const age = computeAge(rsvpForm.birthDate);
    if (age !== null && age < 14 && !rsvpForm.parentalConsent) {
      setRsvpMessage("Eres menor de 14 años. Necesitas el consentimiento de tus padres o tutores.");
      return;
    }

    if (rsvpForm.attendance === "yes") {
      const hasHealthData = rsvpForm.dietarySelection.length > 0 || rsvpForm.dietaryOther.trim();
      if (hasHealthData && !rsvpForm.healthConsent) {
        setRsvpMessage("Debes consentir el tratamiento de tus datos de salud.");
        return;
      }
    }

    const base = rsvpForm.attendance === "yes" && menuEnabled ? `Menú: ${rsvpForm.mealChoice}` : "";
    const diet = rsvpForm.dietaryOther?.trim() ? [...rsvpForm.dietarySelection, rsvpForm.dietaryOther.trim()] : rsvpForm.dietarySelection;
    const dietaryInfo = [base, ...diet].filter(Boolean).join(" | ");

    setIsRsvpSubmitting(true);
    const now = new Date().toISOString();
    try {
      const encryptedDietaryInfo = await encrypt(dietaryInfo, inviteToken);
      const payload = {
        guestName: single,
        attendance: rsvpForm.attendance,
        dietaryInfo: encryptedDietaryInfo,
        mealChoice: rsvpForm.mealChoice || "",
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
      setRsvpEntries((current) => [{ ...payload, id: docRef.id, submittedAt: now, dietaryInfo }, ...current]);
      setRsvpMessage(
        rsvpForm.attendance === "yes"
          ? `Gracias, ${single}. Tu asistencia quedó registrada.`
          : `Gracias, ${single}. Lamentamos que no puedas asistir.`,
      );
      setRsvpForm({
        guestName: "", attendance: "yes", mealChoice: "",
        dietarySelection: [], dietaryOther: "", privacyConsent: false, healthConsent: false,
        birthDate: "", parentalConsent: false,
      });
      setHasSubmitted(true);
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
    } catch {
      setRsvpMessage("No pudimos guardar tu confirmación. Inténtalo de nuevo en unos minutos.");
    } finally {
      setIsRsvpSubmitting(false);
    }
  }, [isRsvpSubmitting, rsvpForm, inviteToken, menuEnabled]);

  const handleDeleteRsvp = useCallback(async () => {
    if (!alreadySubmittedEntry?.id) return;
    if (!window.confirm("¿Estás seguro de retirar tu confirmación?")) return;
    try {
      await deleteDoc(doc(RSVP_COLLECTION_REF, alreadySubmittedEntry.id));
      setRsvpEntries((current) => current.filter((e) => e.id !== alreadySubmittedEntry.id));
      setRsvpMessage("Tu confirmación ha sido retirada.");
      setRsvpForm({
        guestName: "", attendance: "yes", mealChoice: "",
        dietarySelection: [], dietaryOther: "", privacyConsent: false, healthConsent: false,
        birthDate: "", parentalConsent: false,
      });
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      setHasSubmitted(false);
    } catch {
      setRsvpMessage("No se pudo retirar tu confirmación. Inténtalo de nuevo.");
    }
  }, [alreadySubmittedEntry]);

  const handleClearRsvpEntries = useCallback(async () => {
    if (!window.confirm("¿Borrar todas las respuestas de asistencia? Esta acción no se puede deshacer.")) return;
    try {
      const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
      await Promise.all(snapshot.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));
      setRsvpEntries([]);
      setAdminMessage("Se vació el registro de asistencia.");
      setAdminMessageType("success");
    } catch {
      setAdminMessage("No se pudo vaciar el registro de asistencia.");
      setAdminMessageType("error");
    }
  }, [inviteToken, setAdminMessage, setAdminMessageType]);

  return {
    rsvpEntries, rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    alreadySubmittedEntry,
    updateRsvpField, handleRsvpSubmit, handleClearRsvpEntries, handleDeleteRsvp,
    handleDietaryToggle, DIETARY_OPTIONS,
    setRsvpMessage, setRsvpForm, computeAge,
  };
}
