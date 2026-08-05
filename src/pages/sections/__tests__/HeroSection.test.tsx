import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import HeroSection from "../HeroSection";

const baseProps = {
  className: "test-class",
  style: { opacity: 1 },
  firstName: "John",
  secondName: "Jane",
  inviteMessage: "Welcome!",
};

describe("HeroSection", () => {
  it("renders without couple photo", () => {
    render(<HeroSection {...baseProps} countdown={null} couplePhoto="" />);
    expect(screen.getByText((c: string) => c.includes("John") && c.includes("Jane"))).toBeDefined();
    expect(screen.getByText("Welcome!")).toBeDefined();
    expect(screen.getByText("hero.eyebrow")).toBeDefined();
  });

  it("renders with couple photo", () => {
    render(<HeroSection {...baseProps} couplePhoto="https://example.com/photo.jpg" countdown={null} />);
    expect(screen.getByText((c: string) => c.includes("John") && c.includes("Jane"))).toBeDefined();
  });

  it("handles photo load error", () => {
    render(<HeroSection {...baseProps} couplePhoto="https://example.com/photo.jpg" countdown={null} />);
    const img = screen.getByAltText("hero.couplePhotoAlt");
    act(() => { img.dispatchEvent(new Event("error")); });
  });

  it("shows godparents when provided", () => {
    render(<HeroSection {...baseProps} countdown={null} couplePhoto="" godparent1="Mom" godparent2="Dad" />);
    expect(screen.getByText(/hero.withBlessing/)).toBeDefined();
  });

  it("renders without a first name or godparents", () => {
    render(<HeroSection {...baseProps} firstName="" secondName="" godparent1="Mom" godparent2="" countdown={null} couplePhoto="" />);
    expect(screen.getByText(/^&$/)).toBeDefined();
  });

  it("shows expired countdown", () => {
    render(
      <HeroSection
        {...baseProps}
        countdown={{ years: 0, months: 0, days: 0, expired: true }}
        couplePhoto=""
      />,
    );
    expect(screen.getByText("hero.todayIsWedding")).toBeDefined();
    expect(screen.getByText("hero.todayIsTheDay")).toBeDefined();
  });

  it("shows countdown with years > 0", () => {
    render(
      <HeroSection
        {...baseProps}
        countdown={{ years: 2, months: 3, days: 0, expired: false }}
        couplePhoto=""
      />,
    );
    expect(screen.getByText("hero.missing")).toBeDefined();
    expect(screen.getByText(/countdown\.year/)).toBeDefined();
  });

  it("shows countdown with months and days", () => {
    render(
      <HeroSection
        {...baseProps}
        countdown={{ years: 0, months: 2, days: 15, expired: false }}
        couplePhoto=""
      />
    );
    expect(screen.getByText(/countdown\.month/)).toBeDefined();
    expect(screen.getByText(/countdown\.day/)).toBeDefined();
  });

  it("handles a zeroed non-expired countdown", () => {
    render(
      <HeroSection
        {...baseProps}
        countdown={{ years: 0, months: 0, days: 0, expired: false }}
        couplePhoto=""
      />
    );
    expect(screen.getByText(/countdown\./)).toBeDefined();
  });

  it("handles countdown units that are undefined", () => {
    render(
      <HeroSection
        {...baseProps}
        countdown={{ years: undefined as unknown as number, months: undefined as unknown as number, days: 0, expired: false }}
        couplePhoto=""
      />
    );
    expect(screen.getByText(/countdown\./)).toBeDefined();
  });

  it("truncates at the first zero unit", () => {
    render(
      <HeroSection
        {...baseProps}
        countdown={{ years: 1, months: 0, days: 340, expired: false }}
        couplePhoto=""
      />,
    );
    expect(screen.getByText(/countdown\.year/)).toBeDefined();
    expect(screen.queryByText(/countdown\.month/)).toBeNull();
    expect(screen.queryByText(/countdown\.day/)).toBeNull();
  });

  it("shows only days when months are zero", () => {
    render(
      <HeroSection
        {...baseProps}
        countdown={{ years: 0, months: 0, days: 10, expired: false }}
        couplePhoto=""
      />,
    );
    expect(screen.getByText(/countdown\.day/)).toBeDefined();
    expect(screen.queryByText(/countdown\.month/)).toBeNull();
    expect(screen.queryByText(/countdown\.year/)).toBeNull();
  });

  it("shows only days when everything else is zero", () => {
    render(
      <HeroSection
        {...baseProps}
        countdown={{ years: 0, months: 0, days: 3, expired: false }}
        couplePhoto=""
      />,
    );
    expect(screen.getByText(/countdown\.day/)).toBeDefined();
  });
});
