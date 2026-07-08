export function calcRSVPSummary(entries) {
  const confirmed = entries.filter((e) => e.attendance === "yes");
  const declined = entries.filter((e) => e.attendance === "no");
  const confirmedCount = confirmed.length;
  const declinedCount = declined.length;
  const guestsWithCompanions = confirmed.reduce((sum, e) => sum + 1 + (Number(e.companions) || 0), 0);
  return {
    confirmed: confirmedCount,
    declined: declinedCount,
    pending: Math.max(0, entries.length - confirmedCount - declinedCount),
    totalGuests: entries.reduce((sum, e) => sum + (e.attendance === "yes" ? 1 + (Number(e.companions) || 0) : 1), 0),
    confirmedGuests: guestsWithCompanions,
    allEntries: entries.length,
  };
}

export function getDietarySummary(entries) {
  const confirmed = entries.filter((e) => e.attendance === "yes" && e.dietaryInfo?.trim());
  if (!confirmed.length) return [];
  const counts = {};
  for (const e of confirmed) {
    const items = e.dietaryInfo.split(" | ").map((s) => s.trim().toLowerCase()).filter((s) => s && !s.startsWith("menú:"));
    for (const item of items) {
      if (item) counts[item] = (counts[item] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([item, count]) => ({ item, count }));
}

export function formatRSVPsForCSV(entries) {
  const header = "Nombre,Asistencia,Acompañantes,Info alimentaria,Nota,Fecha";
  const rows = entries.map((e) => {
    const date = e.submittedAt ? new Date(e.submittedAt).toLocaleDateString("es-ES") : "";
    const attendance = e.attendance === "yes" ? "Confirmado" : "No asiste";
    const companions = e.attendance === "yes" ? e.companions : 0;
    const escape = (v) => {
      let s = (v || "").replace(/"/g, '""');
      if (/^[=+\-@|\t\r]/.test(s)) s = `'${s}`;
      return `"${s}"`;
    };
    return [escape(e.guestName), escape(attendance), companions, escape(e.dietaryInfo), escape(e.note), escape(date)].join(",");
  });
  return [header, ...rows].join("\n");
}

export function groupRSVPsByAttendance(entries) {
  return {
    yes: entries.filter((e) => e.attendance === "yes"),
    no: entries.filter((e) => e.attendance === "no"),
  };
}

export function formatGuestDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("es-ES", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function getCompanionList(entry) {
  const count = entry.attendance === "yes" ? Number(entry.companions) || 0 : 0;
  if (count === 0) return [];
  if (count === 1) return ["1 acompañante"];
  return [`${count} acompañantes`];
}
