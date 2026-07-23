import { describe, it, expect } from "vitest";
import { formatBytes, searchInvitations } from "../superadmin-utils";

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
