import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import InfoSection from "../InfoSection";

describe("InfoSection", () => {
  it("renders schedule events, dress code, and known kids policy", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingScheduleEvents={JSON.stringify([
          { time: "16:00", text: "Ceremonia" },
          { time: "18:00", text: "Cóctel" },
        ])}
        weddingDressCode="Formal"
        kidsPolicy="playArea"
      />,
    );
    expect(screen.getByText("info.sectionLabel")).toBeDefined();
    expect(screen.getByText("16:00")).toBeDefined();
    expect(screen.getByText("Ceremonia")).toBeDefined();
    expect(screen.getByText("18:00")).toBeDefined();
    expect(screen.getByText("kidsPolicy.options.playArea")).toBeDefined();
  });

  it("renders schedule events without time", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingScheduleEvents={JSON.stringify([{ time: "", text: "Ceremonia at 4pm" }])}
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("Ceremonia at 4pm")).toBeDefined();
    expect(screen.getByText("info.dressCodePending")).toBeDefined();
  });

  it("hides the schedule block when there are no events", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingScheduleEvents=""
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.queryByText("info.sectionLabel")).toBeNull();
    expect(screen.queryByText("info.scheduleTitle")).toBeNull();
    expect(screen.getByText("info.dressCodePending")).toBeDefined();
  });

  it("renders with unknown kids policy string", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
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

  it("hides the schedule block for invalid schedule events JSON", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingScheduleEvents="not-json"
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.queryByText("info.sectionLabel")).toBeNull();
    expect(screen.queryByText("info.scheduleTitle")).toBeNull();
  });

  it("shows the custom dress code message when the option is 'Otro'", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDressCode="Otro"
        weddingDressCodeCustom="Vestimenta vintage"
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("Vestimenta vintage")).toBeDefined();
  });

  it("shows the predefined dress code as-is when not 'Otro'", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDressCode="Vestimenta formal"
        weddingDressCodeCustom=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("Vestimenta formal")).toBeDefined();
  });
});
