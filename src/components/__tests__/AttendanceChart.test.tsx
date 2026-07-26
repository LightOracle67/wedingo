import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { DonutChart } from "../AttendanceChart";

afterEach(cleanup);

describe("DonutChart", () => {
  it("renders total and translation key when data is provided", () => {
    render(<DonutChart yes={5} no={2} pending={3} />);
    expect(screen.getByText("chart.total")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
  });
  it("renders empty state when all values are zero", () => {
    render(<DonutChart yes={0} no={0} pending={0} />);
    expect(screen.getByLabelText("chart.noData")).toBeDefined();
  });
});
