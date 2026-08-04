type AnyRecord = Record<string, unknown>;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function calcGlobalStats(invitations: AnyRecord[], rsvps: AnyRecord[], tokens: AnyRecord[]) {
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

export function searchInvitations(invitations: Record<string, unknown>[], query: string) {
  if (!query?.trim()) return invitations;
  const q = query.trim().toLowerCase();
  return invitations.filter((inv: Record<string, unknown>) => {
    const name = `${String(inv.firstName ?? "")} ${String(inv.secondName ?? "")}`.toLowerCase();
    const user = String(inv.adminUsername ?? "").toLowerCase();
    const token = String(inv.id ?? "").toLowerCase();
    return name.includes(q) || user.includes(q) || token.includes(q);
  });
}

export function tokenUsageOverTime(tokens: Record<string, unknown>[]) {
  const byDate: Record<string, number> = {};
  for (const t of tokens) {
    const ts = (t.createdAt as { toDate?: () => Date; seconds?: number })?.toDate?.() || ((t.createdAt as { seconds?: number })?.seconds ? new Date((t.createdAt as { seconds: number }).seconds * 1000) : null);
    if (!ts) continue;
    const key = ts.toISOString().slice(0, 10);
    byDate[key] = (byDate[key] || 0) + 1;
  }
  return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}

export function rsvpOverTime(rsvps: AnyRecord[]) {
  const byDate: Record<string, { total: number; yes: number; no: number }> = {};
  for (const r of rsvps) {
    const submittedAt = r.submittedAt as { toDate?: () => Date; seconds?: number } | undefined;
    const ts = submittedAt?.toDate?.() || (submittedAt?.seconds ? new Date(submittedAt.seconds * 1000) : null);
    if (!ts) continue;
    const key = ts.toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = { total: 0, yes: 0, no: 0 };
    byDate[key].total++;
    if (r.attendance === "yes") byDate[key].yes++;
    else byDate[key].no++;
  }
  return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
}
