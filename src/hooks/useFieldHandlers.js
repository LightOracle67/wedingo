import { useCallback } from "react";

export function useFieldHandlers(updateFormField, maxAllowedYear, weddingMinute) {
  const handleDayChange = useCallback((value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingDay", "");
      return;
    }
    const numericDay = Number.parseInt(digits, 10);
    const clamped = Math.min(31, Math.max(1, numericDay));
    updateFormField("weddingDay", String(clamped));
  }, [updateFormField]);

  const handleHourChange = useCallback((value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingHour", "");
      return;
    }
    const numericHour = Number.parseInt(digits, 10);
    const clamped = Math.min(23, Math.max(0, numericHour));
    updateFormField("weddingHour", String(clamped));
  }, [updateFormField]);

  const handleMinuteChange = useCallback((value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingMinute", "");
      return;
    }
    if (digits.length === 1) {
      updateFormField("weddingMinute", digits);
      return;
    }
    const numericMinute = Number.parseInt(digits, 10);
    const clamped = Math.min(59, Math.max(0, numericMinute));
    updateFormField("weddingMinute", String(clamped).padStart(2, "0"));
  }, [updateFormField]);

  const handleMinuteBlur = useCallback(() => {
    const digits = (weddingMinute || "").replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingMinute", "");
      return;
    }
    const numericMinute = Number.parseInt(digits, 10);
    const clamped = Math.min(59, Math.max(0, numericMinute));
    updateFormField("weddingMinute", String(clamped).padStart(2, "0"));
  }, [updateFormField, weddingMinute]);

  const handleYearChange = useCallback((value) => {
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
  }, [updateFormField, maxAllowedYear]);

  const handleCoordinateChange = useCallback((field, value) => {
    const normalized = value.replace(/,/g, ".").replace(/[^0-9.-]/g, "");
    updateFormField(field, normalized.slice(0, 18));
  }, [updateFormField]);

  return {
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange,
  };
}
