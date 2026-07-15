import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import { buildGoogleCalendarUrl } from "../lib/calendar-utils";

export function useCalendar(config) {
  const { t } = useTranslation();
  const formattedDate = useMemo(() => {
    const day = config.weddingDay.trim();
    const month = config.weddingMonth.trim();
    const year = config.weddingYear.trim();
    if (!day || !month || !year) return "";
    const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} de ${monthLabel} de ${year}`;
  }, [config.weddingDay, config.weddingMonth, config.weddingYear]);

  const formattedTime = useMemo(() => {
    const hour = config.weddingHour.trim();
    const minute = config.weddingMinute.trim();
    if (!hour || !minute) return "";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }, [config.weddingHour, config.weddingMinute]);

  const calendarLink = useMemo(() => {
    const day = Number.parseInt(config.weddingDay.trim(), 10);
    const month = MONTH_VALUE_TO_NUMBER[config.weddingMonth.trim()];
    const year = Number.parseInt(config.weddingYear.trim(), 10);
    const hour = Number.parseInt(config.weddingHour.trim(), 10);
    const minute = Number.parseInt(config.weddingMinute.trim(), 10);

    if (!month || Number.isNaN(day) || Number.isNaN(year) || Number.isNaN(hour) || Number.isNaN(minute)) return null;

    const startDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (startDate.getFullYear() !== year || startDate.getMonth() !== month - 1 || startDate.getDate() !== day) return null;

    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const coupleNames = [config.firstName, config.secondName].filter(Boolean).join(" & ") || t("calendar.defaultTitle");
    const title = t("calendar.eventTitle", { names: coupleNames });
    const place = config.weddingPlace || t("calendar.placeUnknown");
    const description = [
      t("calendar.invitationText"),
      formattedTime ? `${t("calendar.timeLabel")} ${formattedTime}` : "",
      config.weddingPlace ? `${t("calendar.placeLabel")} ${config.weddingPlace}` : "",
    ].filter(Boolean).join("\n");

    return buildGoogleCalendarUrl({ title, description, place, startDate, endDate });
  }, [config, formattedTime, t]);

  return { formattedDate, formattedTime, calendarLink };
}
