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

/* formatRSVPsForCSV, groupRSVPsByAttendance, formatGuestDate, getCompanionList eliminados por dead code. */
