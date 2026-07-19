import { describe, it, expect } from "vitest";
import { formatBytes, calcGlobalStats, searchInvitations } from "../superadmin-utils";

describe("formatBytes", () => {
  it("formats bytes under 1024", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1048575)).toBe("1024.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.00 MB");
    expect(formatBytes(2097152)).toBe("2.00 MB");
    expect(formatBytes(1500000)).toBe("1.43 MB");
  });
});

describe("calcGlobalStats", () => {
  it("returns zeros for empty arrays", () => {
    const result = calcGlobalStats([], [], []);
    expect(result.rsvpTotal).toBe(0);
    expect(result.invitationCount).toBe(0);
    expect(result.tokensTotal).toBe(0);
    expect(result.totalBytes).toBe(0);
  });

  it("counts RSVPs by attendance", () => {
    const rsvps = [
      { attendance: "yes" },
      { attendance: "yes" },
      { attendance: "no" },
    ];
    const result = calcGlobalStats([], rsvps, []);
    expect(result.rsvpTotal).toBe(3);
    expect(result.rsvpYes).toBe(2);
    expect(result.rsvpNo).toBe(1);
  });

  it("counts guests with companions", () => {
    const rsvps = [
      { attendance: "yes", companions: "2" },
      { attendance: "yes", companions: "0" },
    ];
    const result = calcGlobalStats([], rsvps, []);
    expect(result.totalGuests).toBe(4);
  });

  it("counts invitation bytes", () => {
    const invitations = [{ firstName: "Juan" }, { firstName: "María", secondName: "López" }];
    const result = calcGlobalStats(invitations, [], []);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.invitationCount).toBe(2);
  });

  it("classifies tokens by usage", () => {
    const tokens = [
      { used: true, autoGen: true },
      { used: false, autoGen: false },
      { used: false, autoGen: true },
    ];
    const result = calcGlobalStats([], [], tokens);
    expect(result.tokensTotal).toBe(3);
    expect(result.tokensUsed).toBe(1);
    expect(result.tokensAvailable).toBe(2);
    expect(result.autoTokens).toBe(2);
    expect(result.manualTokens).toBe(1);
  });

  it("handles companion as non-numeric", () => {
    const rsvps = [{ attendance: "yes", companions: "abc" }];
    const result = calcGlobalStats([], rsvps, []);
    expect(result.totalGuests).toBe(1);
  });
});

describe("searchInvitations", () => {
  const invitations = [
    { id: "ABC", firstName: "Juan", secondName: "Pérez", adminUsername: "juanperez" },
    { id: "DEF", firstName: "María", secondName: "García", adminUsername: "mariagarcia" },
  ];

  it("returns all invitations for empty query", () => {
    expect(searchInvitations(invitations, "")).toEqual(invitations);
    expect(searchInvitations(invitations, "  ")).toEqual(invitations);
    expect(searchInvitations(invitations, null)).toEqual(invitations);
    expect(searchInvitations(invitations, undefined)).toEqual(invitations);
  });

  it("filters by first name", () => {
    const result = searchInvitations(invitations, "juan");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ABC");
  });

  it("filters by second name", () => {
    const result = searchInvitations(invitations, "garcía");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("DEF");
  });

  it("filters by adminUsername", () => {
    const result = searchInvitations(invitations, "mariagarcia");
    expect(result).toHaveLength(1);
  });

  it("filters by token/id", () => {
    const result = searchInvitations(invitations, "abc");
    expect(result).toHaveLength(1);
  });

  it("returns empty array for no match", () => {
    expect(searchInvitations(invitations, "zzzzz")).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(searchInvitations(invitations, "JUAN")).toHaveLength(1);
    expect(searchInvitations(invitations, "GARCÍA")).toHaveLength(1);
  });
});
