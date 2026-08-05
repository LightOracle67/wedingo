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

