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
  console.log("[app]", "[useRsvpSubmit]", "mount", { hasValidate: !!validate });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
    console.log("[app]", "[useRsvpSubmit]", "submit start", data);
    if (validate) {
      const error = validate(data);
      if (error) {
        console.log("[app]", "[useRsvpSubmit]", "validation fail", { error });
        setSubmitError(error);
        return false;
      }
      console.log("[app]", "[useRsvpSubmit]", "validation pass");
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(data);
      console.log("[app]", "[useRsvpSubmit]", "submit success");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error submitting RSVP";
      console.error("[app]", "[useRsvpSubmit]", "submit error", { message });
      setSubmitError(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, validate]);

  const resetError = useCallback(() => setSubmitError(null), []);

  return { submitting, submitError, handleSubmit, resetError };
}
