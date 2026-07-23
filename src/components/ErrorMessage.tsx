import { useTranslation } from "react-i18next";
import { getFirestoreErrorMessage } from "../lib/error-utils";

interface ErrorMessageProps {
  error: unknown;
  className?: string;
}

export function ErrorMessage({ error, className }: ErrorMessageProps) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <p className={className} role="alert" style={{ color: "var(--color-error-text, #e74c3c)", fontSize: "0.85rem" }}>
      {getFirestoreErrorMessage(error, t)}
    </p>
  );
}
