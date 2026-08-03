import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import InfoSection from "../InfoSection";

describe("InfoSection", () => {
  it("renders with schedule, dress code, and known kids policy", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingSchedule={"16:00 Ceremony\n18:00 Reception"}
        weddingDressCode="Formal"
        kidsPolicy="playArea"
      />,
    );
    expect(screen.getByText("info.sectionLabel")).toBeDefined();
    expect(screen.getByText("16:00")).toBeDefined();
    expect(screen.getByText((text: string) => text.includes("Ceremony"))).toBeDefined();
    expect(screen.getByText("kidsPolicy.options.playArea")).toBeDefined();
  });

  it("renders with schedule without time match", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingSchedule="Ceremony at 4pm"
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("Ceremony at 4pm")).toBeDefined();
    expect(screen.getByText("info.dressCodePending")).toBeDefined();
  });

  it("renders without schedule or dress code", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingSchedule=""
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("info.schedulePending")).toBeDefined();
    expect(screen.getByText("info.dressCodePending")).toBeDefined();
  });

  it("renders with unknown kids policy string", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingSchedule=""
        weddingDressCode=""
        kidsPolicy="Custom policy text"
      />,
    );
    expect(screen.getByText("Custom policy text")).toBeDefined();
  });

  it("renders schedule events with time and text", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingSchedule={"18:00 Legacy line"}
        weddingScheduleEvents={JSON.stringify([
          { time: "18:00", text: "Ceremonia" },
          { time: "", text: "Cóctel sin hora" },
        ])}
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("18:00")).toBeDefined();
    expect(screen.getByText("Ceremonia")).toBeDefined();
    expect(screen.getByText("Cóctel sin hora")).toBeDefined();
  });

  it("falls back to legacy schedule when no events", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingSchedule={"16:00 Ceremony"}
        weddingScheduleEvents=""
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("16:00")).toBeDefined();
    expect(screen.getByText((text: string) => text.includes("Ceremony"))).toBeDefined();
  });

  it("ignores invalid schedule events JSON", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingSchedule={"16:00 Ceremony"}
        weddingScheduleEvents="not-json"
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("16:00")).toBeDefined();
  });
});
