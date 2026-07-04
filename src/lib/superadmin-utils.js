export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function calcGlobalStats(invitations, rsvps, tokens) {
  const rsvpYes = rsvps.filter((r) => r.attendance === "yes");
  const rsvpNo = rsvps.filter((r) => r.attendance === "no");
  const totalGuests = rsvpYes.reduce((s, r) => s + 1 + (Number(r.companions) || 0), 0);
  const invitationCount = invitations.length;
  const totalBytes = invitations.reduce((acc, d) => {
    try { return acc + new Blob([JSON.stringify(d)]).size; } catch { return acc; }
  }, 0);
  const tokensTotal = tokens.length;
  const tokensUsed = tokens.filter((t) => t.used === true).length;
  const tokensAvailable = tokens.filter((t) => !t.used).length;
  const autoTokens = tokens.filter((t) => t.autoGen === true).length;
  const manualTokens = tokensTotal - autoTokens;

  return {
    rsvpTotal: rsvps.length,
    rsvpYes: rsvpYes.length,
    rsvpNo: rsvpNo.length,
    totalGuests,
    invitationCount,
    totalBytes,
    tokensTotal,
    tokensUsed,
    tokensAvailable,
    autoTokens,
    manualTokens,
  };
}

export function searchInvitations(invitations, query) {
  if (!query?.trim()) return invitations;
  const q = query.trim().toLowerCase();
  return invitations.filter((inv) => {
    const name = `${inv.firstName || ""} ${inv.secondName || ""}`.toLowerCase();
    const user = (inv.adminUsername || "").toLowerCase();
    const token = (inv.id || "").toLowerCase();
    return name.includes(q) || user.includes(q) || token.includes(q);
  });
}

export function tokenUsageOverTime(tokens) {
  const byDate = {};
  for (const t of tokens) {
    const ts = t.createdAt?.toDate?.() || (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : null);
    if (!ts) continue;
    const key = ts.toISOString().slice(0, 10);
    byDate[key] = (byDate[key] || 0) + 1;
  }
  return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}

export function rsvpByInvitation(rsvps) {
  const grouped = {};
  for (const r of rsvps) {
    const key = r.inviteToken || "__unknown__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }
  return grouped;
}

export function rsvpOverTime(rsvps) {
  const byDate = {};
  for (const r of rsvps) {
    const ts = r.submittedAt?.toDate?.() || (r.submittedAt?.seconds ? new Date(r.submittedAt.seconds * 1000) : null);
    if (!ts) continue;
    const key = ts.toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = { total: 0, yes: 0, no: 0 };
    byDate[key].total++;
    if (r.attendance === "yes") byDate[key].yes++;
    else byDate[key].no++;
  }
  return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
}
