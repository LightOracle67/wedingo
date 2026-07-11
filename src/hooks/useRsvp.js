/**
 * useRsvp.js
 * ─────────────────────────────────────────────────────────────
 * Hook personalizado para gestionar las confirmaciones de
 * asistencia (RSVP) de los invitados.
 *
 * Funcionalidades:
 * - Cargar las respuestas RSVP desde Firestore.
 * - Gestionar el formulario de confirmación (nombre, asistencia,
 *   menú, restricciones alimentarias).
 * - Validar consentimientos (privacidad, salud, edad, menores).
 * - Encriptar información dietética antes de guardar.
 * - Pre-llenar el formulario si el invitado ya confirmó.
 * - Eliminar respuestas individuales o en lote.
 *
 * @module useRsvp
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { addDoc, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { RSVP_COLLECTION_REF, rsvpByInviteRef } from "../lib/firebase";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { computeAge } from "../lib/date-utils";
import { DIETARY_OPTIONS, parseDietaryInfo } from "../lib/rsvp-utils";

/**
 * Hook de gestión de RSVP.
 *
 * @param {string} inviteToken - Token de la invitación.
 * @param {function} setAdminMessage - Setter para mensajes en panel admin.
 * @param {function} setAdminMessageType - Setter para tipo de mensaje admin.
 * @param {boolean} menuEnabled - Si el menú está habilitado.
 * @returns {object} Estado y handlers del RSVP.
 */
export function useRsvp(inviteToken, setAdminMessage, setAdminMessageType, menuEnabled) {
  // ─── Estados del RSVP ──────────────────────────────────
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
  /** Timeout para limpiar el estado de envío. */
  const rsvpSubmitTimeoutRef = useRef(null);
  /** Referencia para evitar re-precarga cíclica del formulario. */
  const prefillRef = useRef(null);

  // ─── Limpieza del timeout al desmontar ─────────────────
  useEffect(() => {
    const timeout = rsvpSubmitTimeoutRef.current;
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  /**
   * Carga las respuestas RSVP desde Firestore y las ordena por fecha.
   * Desencripta la información dietética de cada entrada.
   */
  useEffect(() => {
    const hydrateRsvp = async () => {
      if (!inviteToken) return;
      try {
        const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
        const entries = (await Promise.all(snapshot.docs
          .map(async (entryDoc) => {
            const data = entryDoc.data();
            // Normaliza la fecha de envío (puede ser Timestamp, string o número)
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
          // Ordena por fecha, más reciente primero
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setRsvpEntries(entries);
      } catch {
        setRsvpEntries([]);
      }
    };
    hydrateRsvp();
  }, [inviteToken]);

  /**
   * Detecta si el invitado ya confirmó (por nombre) y pre-llena el formulario.
   * Usa prefillRef para evitar bucles de actualización.
   */
  useEffect(() => {
    const name = rsvpForm.guestName.trim().toLowerCase();
    if (!name) {
      setAlreadySubmittedEntry(null);
      prefillRef.current = null;
      return;
    }
    const match = rsvpEntries.find((e) => e.guestName.trim().toLowerCase() === name) || null;
    if (match) {
      // Solo pre-llena si es una entrada nueva (diferente ID)
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

  /**
   * Alterna una restricción alimentaria en la selección del formulario.
   *
   * @param {string} value - Valor de la restricción a alternar.
   */
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

  /**
   * Actualiza un campo individual del formulario RSVP.
   * Si cambia la asistencia a "no", resetea los acompañantes a 0.
   * Si cambia el nombre, resetea la referencia de precarga.
   *
   * @param {string} field - Nombre del campo.
   * @param {*} value - Nuevo valor.
   */
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

  /**
   * Envía la confirmación de asistencia.
   *
   * Validaciones:
   * - Nombre obligatorio.
   * - Elección de menú obligatoria si el menú está habilitado.
   * - Consentimiento de privacidad obligatorio.
   * - Fecha de nacimiento obligatoria.
   * - Consentimiento parental para menores de 14 años.
   * - Consentimiento de datos de salud si hay restricciones alimentarias.
   *
   * @param {Event} event - Evento submit del formulario.
   */
  const handleRsvpSubmit = useCallback(async (event) => {
    event.preventDefault();
    // Previene envíos duplicados
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

    // Consentimiento de datos de salud requerido si hay datos sensibles
    if (rsvpForm.attendance === "yes") {
      const hasHealthData = rsvpForm.dietarySelection.length > 0 || rsvpForm.dietaryOther.trim();
      if (hasHealthData && !rsvpForm.healthConsent) {
        setRsvpMessage("Debes consentir el tratamiento de tus datos de salud.");
        return;
      }
    }

    // Construye la cadena de información dietética
    const base = rsvpForm.attendance === "yes" && menuEnabled ? `Menú: ${rsvpForm.mealChoice}` : "";
    const diet = rsvpForm.dietaryOther?.trim() ? [...rsvpForm.dietarySelection, rsvpForm.dietaryOther.trim()] : rsvpForm.dietarySelection;
    const dietaryInfo = [base, ...diet].filter(Boolean).join(" | ");

    setIsRsvpSubmitting(true);
    const now = new Date().toISOString();
    try {
      // Encripta la información dietética antes de guardar
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
      // Incluye fecha de nacimiento si se proporcionó
      if (rsvpForm.birthDate) {
        payload.birthDate = rsvpForm.birthDate;
      }
      // Marca consentimiento parental para menores
      if (age !== null && age < 14) {
        payload.parentalConsent = true;
      }
      // Marca consentimiento de datos de salud
      if (rsvpForm.healthConsent) {
        payload.healthConsent = true;
        payload.healthConsentAt = serverTimestamp();
      }
      const docRef = await addDoc(RSVP_COLLECTION_REF, payload);
      // Añade la entrada a la lista local
      setRsvpEntries((current) => [{ ...payload, id: docRef.id, submittedAt: now, dietaryInfo }, ...current]);
      setRsvpMessage(
        rsvpForm.attendance === "yes"
          ? `Gracias, ${single}. Tu asistencia quedó registrada.`
          : `Gracias, ${single}. Lamentamos que no puedas asistir.`,
      );
      // Resetea el formulario tras envío exitoso
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

  /**
   * Elimina la confirmación de asistencia del invitado actual.
   * Requiere confirmación del usuario.
   */
  const handleDeleteRsvp = useCallback(async () => {
    if (!alreadySubmittedEntry?.id) return;
    if (!window.confirm("¿Estás seguro de retirar tu confirmación?")) return;
    try {
      await deleteDoc(doc(RSVP_COLLECTION_REF, alreadySubmittedEntry.id));
      setRsvpEntries((current) => current.filter((e) => e.id !== alreadySubmittedEntry.id));
      setRsvpMessage("Tu confirmación ha sido retirada.");
      // Resetea el formulario
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

  /**
   * Vacía todas las respuestas de asistencia (solo admin).
   * Requiere confirmación del usuario.
   */
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
