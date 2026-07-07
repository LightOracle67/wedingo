import { useCallback, useEffect, useRef, useState } from "react";
import { addDoc, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { RSVP_COLLECTION_REF, rsvpByInviteRef } from "../lib/firebase";

const DIETARY_OPTIONS = [
  { value: "sin gluten", label: "Sin gluten" },
  { value: "sin lactosa", label: "Sin lactosa" },
  { value: "alergia frutos secos", label: "Alergia a frutos secos" },
  { value: "alergia mariscos", label: "Alergia a mariscos" },
];

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
    ageConsent: false,
  });
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const rsvpSubmitTimeoutRef = useRef(null);

  const dietaryInfoStr = [rsvpForm.dietarySelection, rsvpForm.dietaryOther].flat().filter(Boolean).join(", ");

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
        const entries = snapshot.docs
          .map((entryDoc) => {
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
              dietaryInfo: data.dietaryInfo || "",
              note: data.note || "",
              submittedAt,
            };
          })
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setRsvpEntries(entries);
      } catch {
        setRsvpEntries([]);
      }
    };
    hydrateRsvp();
  }, [inviteToken]);

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
    if (field === "attendance" && value === "no") {
      setRsvpForm((current) => ({ ...current, attendance: value, companions: 0 }));
      return;
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

    if (!rsvpForm.ageConsent) {
      setRsvpMessage("Debes confirmar tu edad o tener consentimiento parental.");
      return;
    }

    const hasHealthData = rsvpForm.dietarySelection.length > 0 || rsvpForm.dietaryOther.trim();
    if (hasHealthData && !rsvpForm.healthConsent) {
      setRsvpMessage("Debes consentir el tratamiento de tus datos de salud.");
      return;
    }

    const base = rsvpForm.attendance === "yes" && menuEnabled ? `Menú: ${rsvpForm.mealChoice}` : "";
    const diet = rsvpForm.dietaryOther?.trim() ? [...rsvpForm.dietarySelection, rsvpForm.dietaryOther.trim()] : rsvpForm.dietarySelection;
    const dietaryInfo = [base, ...diet].filter(Boolean).join(" | ");

    setIsRsvpSubmitting(true);
    const now = new Date().toISOString();
    try {
      const payload = {
        guestName: single,
        attendance: rsvpForm.attendance,
        dietaryInfo,
        inviteToken,
        submittedAt: serverTimestamp(),
        privacyConsent: true,
        privacyConsentAt: serverTimestamp(),
        privacyPolicyVersion: "2026-07-07",
        healthConsent: rsvpForm.healthConsent,
        healthConsentAt: rsvpForm.healthConsent ? serverTimestamp() : null,
      };
      const doc = await addDoc(RSVP_COLLECTION_REF, payload);
      setRsvpEntries((current) => [{ ...payload, id: doc.id, submittedAt: now }, ...current]);
      setRsvpMessage(
        rsvpForm.attendance === "yes"
          ? `Gracias, ${single}. Tu asistencia quedó registrada.`
          : `Gracias, ${single}. Lamentamos que no puedas asistir.`,
      );
      setRsvpForm({
        guestName: "", attendance: "yes", mealChoice: "",
        dietarySelection: [], dietaryOther: "", privacyConsent: false, healthConsent: false, ageConsent: false,
      });
      setHasSubmitted(true);
    } catch {
      setRsvpMessage("No pudimos guardar tu confirmación. Inténtalo de nuevo en unos minutos.");
    } finally {
      setIsRsvpSubmitting(false);
    }
  }, [isRsvpSubmitting, rsvpForm, inviteToken]);

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
    updateRsvpField, handleRsvpSubmit, handleClearRsvpEntries,
    handleDietaryToggle, dietaryInfoStr, DIETARY_OPTIONS,
    setRsvpMessage, setRsvpForm,
  };
}
