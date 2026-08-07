const padDatePart = (value: string | number) => String(value).padStart(2, "0");

const formatCalendarDateTime = (date: Date) =>
  `${date.getFullYear()}${padDatePart(date.getMonth() + 1)}${padDatePart(date.getDate())}T${padDatePart(date.getHours())}${padDatePart(date.getMinutes())}00`;

export const buildGoogleCalendarUrl = ({
  title,
  description,
  place,
  startDate,
  endDate,
}: {
  title: string;
  description: string;
  place: string;
  startDate: Date;
  endDate: Date;
}) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location: place,
    dates: `${formatCalendarDateTime(startDate)}/${formatCalendarDateTime(endDate)}`,
    ctz: timezone,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
