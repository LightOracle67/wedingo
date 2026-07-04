import { useCallback, useEffect, useRef, useState } from "react";
import { addDoc, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { RSVP_COLLECTION_REF, rsvpByInviteRef } from "../lib/firebase";

const DIETARY_OPTIONS = [
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "sin gluten", label: "Sin gluten" },
  { value: "sin lactosa", label: "Sin lactosa" },
  { value: "alergia frutos secos", label: "Alergia a frutos secos" },
  { value: "alergia mariscos", label: "Alergia a mariscos" },
  { value: "sin cerdo", label: "Sin cerdo" },
];

export function useRsvp(inviteToken, setAdminMessage, setAdminMessageType) {
  const [rsvpEntries, setRsvpEntries] = useState([]);
  const [rsvpForm, setRsvpForm] = useState({
    guestName: "",
    attendance: "yes",
    companions: "0",
    dietarySelection: [],
    dietaryOther: "",
    note: "",
  });
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const rsvpSubmitTimeoutRef = useRef(null);

  const dietaryInfoStr = [rsvpForm.dietarySelection, rsvpForm.dietaryOther].flat().filter(Boolean).join(", ");

  useEffect(() => {
    return () => {
      if (rsvpSubmitTimeoutRef.current) clearTimeout(rsvpSubmitTimeoutRef.current);
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
            const submittedDate = data.submittedAt?.toDate?.();
            return {
              id: entryDoc.id,
              guestName: data.guestName || "",
              attendance: data.attendance || "no",
              companions: Number.isFinite(data.companions) ? data.companions : 0,
              dietaryInfo: data.dietaryInfo || "",
              note: data.note || "",
              submittedAt: submittedDate ? submittedDate.toISOString() : new Date().toISOString(),
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
      setRsvpForm((current) => ({ ...current, attendance: value, companions: "0" }));
      return;
    }
    setRsvpForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleRsvpSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (isRsvpSubmitting) return;

    const guestName = rsvpForm.guestName.trim();
    if (!guestName) {
      setRsvpMessage("Escribe tu nombre para confirmar la asistencia.");
      return;
    }

    const companionsParam = rsvpForm.attendance === "yes" ? rsvpForm.companions : "0";
    const companions = Number.parseInt(companionsParam, 10);
    const companionsCount = Number.isNaN(companions) ? 0 : Math.max(0, Math.min(10, companions));

    const dietaryInfo = [rsvpForm.dietarySelection, rsvpForm.dietaryOther].flat().filter(Boolean).join(", ");
    const responsePayload = {
      guestName,
      attendance: rsvpForm.attendance,
      companions: companionsCount,
      dietaryInfo,
      note: rsvpForm.note.trim(),
      inviteToken: inviteToken,
      submittedAt: serverTimestamp(),
    };

    setIsRsvpSubmitting(true);
    try {
      const createdDoc = await addDoc(RSVP_COLLECTION_REF, responsePayload);
      const responseRecord = {
        ...responsePayload,
        id: createdDoc.id,
        submittedAt: new Date().toISOString(),
      };
      setRsvpEntries((currentEntries) => [responseRecord, ...currentEntries]);
      setRsvpMessage(
        rsvpForm.attendance === "yes"
          ? `Gracias, ${guestName}. Tu asistencia quedó marcada con ${companionsCount} acompañante${companionsCount === 1 ? "" : "s"}.`
          : `Gracias, ${guestName}. Lamentamos que no puedas asistir.`,
      );
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
