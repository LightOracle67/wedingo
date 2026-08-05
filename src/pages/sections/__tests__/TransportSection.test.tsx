import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../components/MapEmbed", () => ({
  default: ({ mapUrl }: { mapUrl?: string }) => <div data-testid="map-embed">{mapUrl}</div>,
}));

import TransportSection from "../TransportSection";

const baseProps = {
  style: {},
  className: "test",
};

describe("TransportSection", () => {
  it("shows apology when no transport option is selected", () => {
    render(<TransportSection {...baseProps} transportEnabled="none" />);
    expect(screen.getByText("transport.apology")).toBeDefined();
    expect(screen.queryByTestId("map-embed")).toBeNull();
  });

  it("shows the selected option and departures with maps", () => {
    const departures = JSON.stringify([
      { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
      { type: "taxi", time: "14:30", url: "" },
    ]);
    render(<TransportSection {...baseProps} transportEnabled="both" transportDepartures={departures} />);
    expect(screen.getByText("transport.optionBoth")).toBeDefined();
    expect(screen.getByText(/12:00/)).toBeDefined();
    expect(screen.getByText(/14:30/)).toBeDefined();
    expect(screen.getByText(/transport.typeBus/)).toBeDefined();
    expect(screen.getByText(/transport.typeTaxi/)).toBeDefined();
    expect(screen.getAllByTestId("map-embed")).toHaveLength(1);
  });

  it("renders option labels per selection", () => {
    const { rerender } = render(<TransportSection {...baseProps} transportEnabled="bus" />);
    expect(screen.getByText("transport.optionBus")).toBeDefined();
    rerender(<TransportSection {...baseProps} transportEnabled="taxi" />);
    expect(screen.getByText("transport.optionTaxi")).toBeDefined();
  });

  it("shows departure names without maps when transportMapMode is 'name'", () => {
    const departures = JSON.stringify([
      { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
    ]);
    render(<TransportSection {...baseProps} transportEnabled="bus" transportDepartures={departures} transportMapMode="name" />);
    expect(screen.getByText(/12:00/)).toBeDefined();
    expect(screen.getByText("Plaza Mayor")).toBeDefined();
    expect(screen.queryByTestId("map-embed")).toBeNull();
  });

  it("hides the departure blocks when transportMapMode is 'hidden'", () => {
    const departures = JSON.stringify([
      { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
    ]);
    render(<TransportSection {...baseProps} transportEnabled="bus" transportDepartures={departures} transportMapMode="hidden" />);
    expect(screen.getByText("transport.optionBus")).toBeDefined();
    expect(screen.queryByText(/12:00/)).toBeNull();
    expect(screen.queryByText("Plaza Mayor")).toBeNull();
    expect(screen.queryByTestId("map-embed")).toBeNull();
  });

  it("renders a departure without a time", () => {
    const departures = JSON.stringify([
      { type: "bus", time: "", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
    ]);
    render(<TransportSection {...baseProps} transportEnabled="bus" transportDepartures={departures} />);
    expect(screen.getByText("Plaza Mayor")).toBeDefined();
    expect(screen.getByTestId("map-embed")).toBeDefined();
  });
});
