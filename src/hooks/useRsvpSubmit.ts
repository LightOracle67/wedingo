import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { safeLogError } from "../lib/safe-error";

interface UseRsvpSubmitOptions {
  token: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  validate?: (data: Record<string, unknown>) => string | null;
}

interface UseRsvpSubmitReturn {
  submitting: boolean;
  submitError: string | null;
  handleSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  resetError: () => void;
}

export function useRsvpSubmit({ token: _token, onSubmit, validate }: UseRsvpSubmitOptions): UseRsvpSubmitReturn {
  // Mensajes de error del submit localizados para el invitado.
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Candado de re-entrada: dos clics rápidos en el mismo tick pasarían el
  // guard por estado (closure stale); el ref descarta el segundo submit.
  const lockRef = useRef(false);

  const handleSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      if (lockRef.current) return false;
      if (validate) {
        const error = validate(data);
        if (error) {
          setSubmitError(error);
          return false;
        }
      }
      lockRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      try {
        await onSubmit(data);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : t("rsvp.saveError");
        safeLogError(["[app]", "[useRsvpSubmit]", "submit error"], err);
        setSubmitError(message);
        return false;      } finally {
        lockRef.current = false;
        setSubmitting(false);
      }
    },
    [onSubmit, validate, t],
  );

  const resetError = useCallback(() => setSubmitError(null), []);

  return { submitting, submitError, handleSubmit, resetError };
}
