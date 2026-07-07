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

export function useRsvp(inviteToken, setAdminMessage, setAdminMessageType, menuEnabled) {
  const [rsvpEntries, setRsvpEntries] = useState([]);
  const [rsvpForm, setRsvpForm] = useState({
    guestName: "",
    guestList: "",
    attendance: "yes",
    companions: "0",
    mealChoice: "",
    noGluten: false,
    noLactosa: false,
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

    const guestNames = rsvpForm.guestList.trim()
      ? rsvpForm.guestList.split("\n").map(s => s.trim()).filter(Boolean)
      : [];

    if (rsvpForm.guestList.trim()) {
      if (!guestNames.length) {
        setRsvpMessage("Escribe al menos un nombre en la lista de invitados.");
        return;
      }
    } else {
      const single = rsvpForm.guestName.trim();
      if (!single) {
        setRsvpMessage("Escribe tu nombre para confirmar la asistencia.");
        return;
      }
      guestNames.push(single);
    }

    const numNames = rsvpForm.guestList.trim() ? guestNames.length : 0;
    const companionsParam = !numNames && rsvpForm.attendance === "yes" ? rsvpForm.companions : "0";
    const companions = Number.parseInt(companionsParam, 10);
    const companionsCount = Number.isNaN(companions) ? 0 : Math.max(0, Math.min(10, companions));
    const extras = [];
    if (rsvpForm.noGluten) extras.push("Sin gluten");
    if (rsvpForm.noLactosa) extras.push("Sin lactosa");
    const dietaryParts = rsvpForm.attendance === "yes" && menuEnabled
      ? [`Menú: ${rsvpForm.mealChoice}`, ...extras]
      : [rsvpForm.dietaryOther];
    const dietaryInfo = dietaryParts.filter(Boolean).join(" | ");

    setIsRsvpSubmitting(true);
    const now = new Date().toISOString();
    const results = [];
    try {
      for (const name of guestNames) {
        const payload = {
          guestName: name,
          attendance: rsvpForm.attendance,
          companions: companionsCount,
          dietaryInfo,
          note: rsvpForm.note.trim(),
          inviteToken,
          submittedAt: serverTimestamp(),
        };
        const doc = await addDoc(RSVP_COLLECTION_REF, payload);
        results.push({ ...payload, id: doc.id, submittedAt: now });
      }
      setRsvpEntries((current) => [...results, ...current]);
      const count = guestNames.length;
      setRsvpMessage(
        rsvpForm.attendance === "yes"
          ? `Gracias. ${count} asistencia${count > 1 ? "s" : ""} registrada${count > 1 ? "s" : ""}.`
          : `Gracias. ${count} confirmación${count > 1 ? "es" : ""} registrada${count > 1 ? "s" : ""}.`,
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
