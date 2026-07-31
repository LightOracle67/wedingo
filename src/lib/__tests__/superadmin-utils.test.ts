import { describe, it, expect } from "vitest";
import { formatBytes, searchInvitations, calcGlobalStats, tokenUsageOverTime, rsvpOverTime } from "../superadmin-utils";

describe("formatBytes", () => {
  it("formats bytes as B", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats bytes as KB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("formats bytes as MB", () => {
    expect(formatBytes(1048576)).toBe("1.00 MB");
  });
});

describe("searchInvitations", () => {
  const invs = [
    { id: "abc123", firstName: "Juan", secondName: "María", adminUsername: "juan" },
    { id: "def456", firstName: "Ana", secondName: "Luis", adminUsername: "ana" },
  ];

  it("filters by firstName", () => {
    expect(searchInvitations(invs, "Juan")).toHaveLength(1);
  });

  it("filters by id", () => {
    expect(searchInvitations(invs, "abc")).toHaveLength(1);
  });

  it("returns all for empty query", () => {
    expect(searchInvitations(invs, "")).toHaveLength(2);
  });

  it("returns empty for no match", () => {
    expect(searchInvitations(invs, "zzz")).toHaveLength(0);
  });
});

describe("calcGlobalStats", () => {
  it("calculates global stats correctly", () => {
    const invs = [{}, {}];
    const rsvps = [
      { attendance: "yes", companions: 2 },
      { attendance: "yes" },
      { attendance: "no" },
    ];
    const tokens = [
      { used: true, autoGen: true },
      { used: false, autoGen: true },
      { used: false, autoGen: false },
    ];
    const stats = calcGlobalStats(invs, rsvps, tokens);
    expect(stats.rsvpTotal).toBe(3);
    expect(stats.rsvpYes).toBe(2);
    expect(stats.rsvpNo).toBe(1);
    expect(stats.totalGuests).toBe(4);
    expect(stats.invitationCount).toBe(2);
    expect(stats.tokensTotal).toBe(3);
    expect(stats.tokensUsed).toBe(1);
    expect(stats.tokensAvailable).toBe(2);
    expect(stats.autoTokens).toBe(2);
    expect(stats.manualTokens).toBe(1);
  });
});

describe("tokenUsageOverTime", () => {
  it("groups tokens by date", () => {
    const tokens = [
      { createdAt: { seconds: 1700000000 } },
      { createdAt: { seconds: 1700000000 } },
      { createdAt: { seconds: 1700086400 } },
    ];
    const result = tokenUsageOverTime(tokens);
    expect(result).toHaveLength(2);
    expect(result[0]!.count).toBe(2);
    expect(result[1]!.count).toBe(1);
  });

  it("skips tokens without valid createdAt", () => {
    const tokens = [{ createdAt: null }, {}];
    const result = tokenUsageOverTime(tokens);
    expect(result).toHaveLength(0);
  });
});

describe("rsvpOverTime", () => {
  it("groups RSVPs by date", () => {
    const rsvps = [
      { submittedAt: { seconds: 1700000000 }, attendance: "yes" },
      { submittedAt: { seconds: 1700000000 }, attendance: "no" },
      { submittedAt: { seconds: 1700086400 }, attendance: "yes" },
    ];
    const result = rsvpOverTime(rsvps);
    expect(result).toHaveLength(2);
    expect(result[0]!.total).toBe(2);
    expect(result[0]!.yes).toBe(1);
    expect(result[0]!.no).toBe(1);
    expect(result[1]!.total).toBe(1);
    expect(result[1]!.yes).toBe(1);
  });

  it("returns empty for no submittedAt", () => {
    const rsvps = [{ attendance: "yes" }];
    const result = rsvpOverTime(rsvps);
    expect(result).toHaveLength(0);
  });
});
