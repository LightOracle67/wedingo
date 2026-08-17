import { describe, it, expect } from "vitest";
import { buildDjRankingCsv, buildDjRankingText } from "../dj-ranking";

describe("buildDjRankingCsv", () => {
  it("orders by votes descending and keeps stable order for ties", () => {
    const csv = buildDjRankingCsv([
      { guestName: "Ana", song: "Vals", votes: 2 },
      { guestName: "Luis", song: "Bachata", votes: 5 },
      { guestName: "Pepe", song: "Rock", votes: 2 },
    ]);
    const rows = csv.split("\n").filter((l) => /^\d+,"/.test(l));
    expect(rows[0]).toContain("Bachata");
    expect(rows[0]).toContain(",5");
    expect(rows[1]).toContain("Vals");
    expect(rows[2]).toContain("Rock");
  });

  it("neutralizes CSV formula injection (=, +, -, @)", () => {
    const csv = buildDjRankingCsv([
      { guestName: "=HYPERLINK(evil)", song: "=1+1", votes: 1 },
      { guestName: "+CMD()", song: "-2+3", votes: 1 },
      { guestName: "@SUM(A1)", song: "Normal", votes: 1 },
    ]);
    expect(csv).toContain("'=HYPERLINK(evil)");
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+CMD()");
    expect(csv).toContain("'-2+3");
    expect(csv).toContain("'@SUM(A1)");
  });

  it("doubles quotes inside CSV fields", () => {
    const csv = buildDjRankingCsv([{ guestName: "Ana", song: 'El "Rey"', votes: 1 }]);
    expect(csv).toContain('"El ""Rey"""');
  });

  it("drops empty or corrupt entries", () => {
    const csv = buildDjRankingCsv([
      { guestName: "A", song: "", votes: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { song: "OnlySong" } as any,
    ]);
    const rows = csv.split("\n").filter((l) => l.length > 0 && /^\d+,"/.test(l));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("OnlySong");
  });

  it("returns only the header when there are no songs", () => {
    const csv = buildDjRankingCsv([]);
    const dataRows = csv.split("\n").filter((l) => /^\d+,"/.test(l));
    expect(dataRows).toHaveLength(0);
    expect(csv).toContain("#,Canción,Invitado,Votos");
  });
});

describe("buildDjRankingText", () => {
  it("returns an empty string when there are no songs", () => {
    expect(buildDjRankingText([])).toBe("");
  });

  it("formats the ranking as readable lines ordered by votes", () => {
    const text = buildDjRankingText([
      { guestName: "Ana", song: "Vals", votes: 2 },
      { guestName: "Luis", song: "Bachata", votes: 5 },
    ]);
    expect(text).toContain("1. Bachata — Luis (5👍)");
    expect(text).toContain("2. Vals — Ana (2👍)");
  });
});
