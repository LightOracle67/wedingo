import { useCallback, useState } from "react";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
    if (validate) {
      const error = validate(data);
      if (error) {
        setSubmitError(error);
        return false;
      }
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(data);
      return true;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error submitting RSVP");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, validate]);

  const resetError = useCallback(() => setSubmitError(null), []);

  return { submitting, submitError, handleSubmit, resetError };
}
