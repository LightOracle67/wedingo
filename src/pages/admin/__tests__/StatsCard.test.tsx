import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatsCard from "../StatsCard";

describe("StatsCard", () => {
  it("renders label and value", () => {
    render(<StatsCard label="Guests" value={42} />);
    expect(screen.getByText("Guests")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders string value", () => {
    render(<StatsCard label="Status" value="Active" />);
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
  });

  it("renders zero value", () => {
    render(<StatsCard label="Count" value={0} />);
    expect(screen.getByText("Count")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined();
  });

  it("has admin-stats-card class", () => {
    const { container } = render(<StatsCard label="Test" value={1} />);
    expect(container.querySelector(".admin-stats-card")).toBeDefined();
  });
});
