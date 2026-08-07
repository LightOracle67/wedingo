import { useCallback } from "react";

export function useFieldHandlers(updateFormField: (field: string, value: string) => void, maxAllowedYear: number) {
  const handleDayChange = useCallback(
    (value: string) => {
      const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
      if (!digits) {
        updateFormField("weddingDay", "");
        return;
      }
      const numericDay = Number.parseInt(digits, 10);
      const clamped = Math.min(31, Math.max(1, numericDay));
      updateFormField("weddingDay", String(clamped));
    },
    [updateFormField],
  );

  const handleTimeChange = useCallback(
    (value: string) => {
      if (!value) {
        updateFormField("weddingHour", "");
        updateFormField("weddingMinute", "");
        return;
      }
      const [hourPart, minutePart] = value.split(":");
      const hourDigits = (hourPart || "").replace(/[^0-9]/g, "").slice(0, 2);
      const minuteDigits = (minutePart || "").replace(/[^0-9]/g, "").slice(0, 2);
      const numericHour = hourDigits ? Number.parseInt(hourDigits, 10) : NaN;
      const numericMinute = minuteDigits ? Number.parseInt(minuteDigits, 10) : NaN;
      const hour = Number.isFinite(numericHour) ? Math.min(23, Math.max(0, numericHour)) : NaN;
      const minute = Number.isFinite(numericMinute) ? Math.min(59, Math.max(0, numericMinute)) : NaN;
      updateFormField("weddingHour", Number.isFinite(hour) ? String(hour).padStart(2, "0") : "");
      updateFormField("weddingMinute", Number.isFinite(minute) ? String(minute).padStart(2, "0") : "");
    },
    [updateFormField],
  );

  const handleTimeBlur = useCallback(
    (value: string) => {
      handleTimeChange(value);
    },
    [handleTimeChange],
  );

  const handleYearChange = useCallback(
    (value: string) => {
      const digits = value.replace(/[^0-9]/g, "").slice(0, 4);
      if (!digits) {
        updateFormField("weddingYear", "");
        return;
      }
      const parsedYear = Number.parseInt(digits, 10);
      if (digits.length === 4 && parsedYear > maxAllowedYear) {
        updateFormField("weddingYear", String(maxAllowedYear));
        return;
      }
      updateFormField("weddingYear", digits);
    },
    [updateFormField, maxAllowedYear],
  );

  return {
    handleDayChange,
    handleTimeChange,
    handleTimeBlur,
    handleYearChange,
  };
}
