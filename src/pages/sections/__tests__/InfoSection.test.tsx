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
          { time: "16:00", text: "Ceremonia", emoji: "💍" },
          { time: "18:00", text: "Cóctel" },
        ])}
        weddingDressCode="formal"
        kidsPolicy="playArea"
      />,
    );
    expect(screen.getByText("info.sectionLabel")).toBeDefined();
    expect(screen.getByText("16:00")).toBeDefined();
    expect(screen.getByText("Ceremonia")).toBeDefined();
    expect(screen.getByText("18:00")).toBeDefined();
    expect(screen.getByText("kidsPolicy.options.playArea")).toBeDefined();
    // El emoji del primer evento se muestra y el segundo (legacy sin emoji) no rompe.
    expect(screen.getByText("💍")).toBeDefined();
  });

  it("renders a large emoji for schedule events that provide one", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingScheduleEvents={JSON.stringify([{ time: "20:00", text: "Fiesta", emoji: "🎉" }])}
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("🎉").classList.contains("schedule-emoji")).toBe(true);
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
    render(<InfoSection className="test" style={{}} weddingScheduleEvents="" weddingDressCode="" kidsPolicy="" />);
    expect(screen.queryByText("info.sectionLabel")).toBeNull();
    expect(screen.queryByText("info.scheduleTitle")).toBeNull();
    expect(screen.getByText("info.dressCodePending")).toBeDefined();
  });

  it("renders with unknown kids policy string", () => {
    render(<InfoSection className="test" style={{}} weddingDressCode="" kidsPolicy="Custom policy text" />);
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
      <InfoSection className="test" style={{}} weddingScheduleEvents="not-json" weddingDressCode="" kidsPolicy="" />,
    );
    expect(screen.queryByText("info.sectionLabel")).toBeNull();
    expect(screen.queryByText("info.scheduleTitle")).toBeNull();
  });

  it("shows the custom dress code message when the option is 'Otro'", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDressCode="custom"
        weddingDressCodeCustom="Vestimenta vintage"
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("Vestimenta vintage")).toBeDefined();
  });

  it("shows the predefined dress code as-is when not 'custom'", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDressCode="formal"
        weddingDressCodeCustom=""
        kidsPolicy=""
      />,
    );
    // La clave se traduce: la etiqueta pública de "formal".
    expect(screen.getByText("info.dressCodeOptions.formal")).toBeDefined();
  });

  it("shows live badges on the wedding day", () => {
    // Hora "ahora" fija (fake timers): 12:30 del 17 de agosto de 2026.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 17, 12, 30, 0, 0));
    const weddingDate = new Date(2026, 7, 17, 12, 0, 0, 0);
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDate={weddingDate}
        weddingScheduleEvents={JSON.stringify([
          { time: "14:00", text: "Ceremonia" },
          { time: "10:00", text: "Cóctel" },
        ])}
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    // 10:00 ya empezó (en curso hasta las 14:00) → badge NOW;
    // 14:00 está por venir (90 min) → badge "en 90 min".
    const badges = document.querySelectorAll(".agenda-badge");
    expect(badges.length).toBe(2);
    expect(badges[0]?.textContent).toContain("info.inMin");
    expect(badges[1]?.textContent).toContain("info.liveNow");
    expect(screen.getByText("Ceremonia")).toBeDefined();
    expect(screen.getByText("Cóctel")).toBeDefined();
    vi.useRealTimers();
  });

  it("highlights the current event with the NOW badge", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 17, 14, 10, 0, 0));
    const weddingDate = new Date(2026, 7, 17, 12, 0, 0, 0);
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDate={weddingDate}
        weddingScheduleEvents={JSON.stringify([
          { time: "14:00", text: "Ceremonia" },
          { time: "18:00", text: "Cena" },
        ])}
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    const badge = document.querySelector(".agenda-badge");
    expect(badge?.textContent).toContain("info.liveNow");
    vi.useRealTimers();
  });

  it("does not show live badges outside the wedding day", () => {
    const weddingDate = new Date(2020, 0, 1, 12, 0, 0); // Evita rollover y es pasado.
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDate={weddingDate}
        weddingScheduleEvents={JSON.stringify([{ time: "14:00", text: "Ceremonia" }])}
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(document.querySelector(".agenda-badge")).toBeNull();
    expect(screen.getByText("Ceremonia")).toBeDefined();
  });

  it("keeps the schedule static with invalid times (no live crash)", () => {
    const weddingDate = new Date();
    weddingDate.setHours(12, 0, 0, 0);
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDate={weddingDate}
        weddingScheduleEvents={JSON.stringify([{ time: "al atardecer", text: "Brindis" }])}
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("Brindis")).toBeDefined();
    // Hora no parseable → sin badge en vivo, pero la lista se muestra igual.
    expect(document.querySelector(".agenda-badge")).toBeNull();
  });

  it("handles a null wedding date without crashing", () => {
    render(
      <InfoSection
        className="test"
        style={{}}
        weddingDate={null}
        weddingScheduleEvents={JSON.stringify([{ time: "20:00", text: "Fiesta" }])}
        weddingDressCode=""
        kidsPolicy=""
      />,
    );
    expect(screen.getByText("Fiesta")).toBeDefined();
  });
});
