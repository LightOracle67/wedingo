import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../lib/platform-settings", () => ({
  usePlatformSettings: () => ({
    settings: {
      maintenance: "false",
      bannerEnabled: "false",
      bannerText: "",
      blockedUrls: "",
      blockedTokens: "",
      expiringDays: "30",
    },
    loaded: true,
    reload: () => undefined,
  }),
  tokenIsBlocked: () => false,
}));

import HeroSection from "../HeroSection";

const baseProps = {
  className: "test-class",
  style: { opacity: 1 },
  firstName: "John",
  secondName: "Jane",
  inviteMessage: "Welcome!",
};

/** Fecha fija de prueba (el countdown se calcula con `new Date()`, que con
 *  fake timers devuelve siempre esta hora). */
const NOW = new Date("2026-01-15T10:00:00Z");

/** Suma años/meses/días/horas/minutos/segundos a una fecha (aritmética de
 *  calendario, la misma que usa computeCountdown). */
function futureDate(parts: { y?: number; mo?: number; d?: number; h?: number; mi?: number; s?: number }) {
  const { y = 0, mo = 0, d = 0, h = 0, mi = 0, s = 0 } = parts;
  return new Date(
    NOW.getFullYear() + y,
    NOW.getMonth() + mo,
    NOW.getDate() + d,
    NOW.getHours() + h,
    NOW.getMinutes() + mi,
    NOW.getSeconds() + s,
  );
}

describe("HeroSection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without couple photo", () => {
    render(<HeroSection {...baseProps} weddingDate={null} couplePhoto="" />);
    expect(screen.getByText((c: string) => c.includes("John") && c.includes("Jane"))).toBeDefined();
    expect(screen.getByText("Welcome!")).toBeDefined();
    expect(screen.getByText("hero.eyebrow")).toBeDefined();
  });

  it("renders with couple photo", () => {
    render(<HeroSection {...baseProps} couplePhoto="https://example.com/photo.jpg" weddingDate={null} />);
    expect(screen.getByText((c: string) => c.includes("John") && c.includes("Jane"))).toBeDefined();
  });

  it("handles photo load error", () => {
    render(<HeroSection {...baseProps} couplePhoto="https://example.com/photo.jpg" weddingDate={null} />);
    const img = screen.getByAltText("hero.couplePhotoAlt");
    img.dispatchEvent(new Event("error"));
    expect(screen.getByAltText("hero.couplePhotoAlt")).toBeDefined();
  });

  it("renders the blessing when godparents are present", () => {
    render(<HeroSection {...baseProps} weddingDate={null} couplePhoto="" godparent1="Mom" godparent2="Dad" />);
    expect(screen.getByText(/hero.withBlessing/)).toBeDefined();
  });

  it("renders without a first name or godparents", () => {
    render(
      <HeroSection
        {...baseProps}
        firstName=""
        secondName=""
        godparent1="Mom"
        godparent2=""
        weddingDate={null}
        couplePhoto=""
      />,
    );
    expect(screen.getByText(/^&$/)).toBeDefined();
  });

  it("shows expired countdown", () => {
    render(<HeroSection {...baseProps} weddingDate={new Date(NOW.getTime() - 1000)} couplePhoto="" />);
    expect(screen.getByText("hero.todayIsWedding")).toBeDefined();
    expect(screen.getByText("hero.todayIsTheDay")).toBeDefined();
  });

  it("shows countdown with years > 0", () => {
    render(<HeroSection {...baseProps} weddingDate={futureDate({ y: 2, mo: 3 })} couplePhoto="" />);
    expect(screen.getByText("hero.missing")).toBeDefined();
    expect(screen.getByText(/countdown\.year/)).toBeDefined();
  });

  it("shows countdown with months and days", () => {
    render(<HeroSection {...baseProps} weddingDate={futureDate({ mo: 2, d: 15 })} couplePhoto="" />);
    expect(screen.getByText(/countdown\.month/)).toBeDefined();
    expect(screen.getByText(/countdown\.day/)).toBeDefined();
  });

  it("handles a zeroed non-expired countdown", () => {
    render(<HeroSection {...baseProps} weddingDate={futureDate({ s: 30 })} couplePhoto="" />);
    expect(screen.getByText(/countdown\./)).toBeDefined();
  });

  it("truncates trailing zero units (hours/minutes/seconds)", () => {
    render(<HeroSection {...baseProps} weddingDate={futureDate({ y: 1, mo: 2, d: 3 })} couplePhoto="" />);
    expect(screen.getByText(/countdown\.year/)).toBeDefined();
    expect(screen.getByText(/countdown\.month/)).toBeDefined();
    expect(screen.getByText(/countdown\.day/)).toBeDefined();
    expect(screen.queryByText(/countdown\.hour/)).toBeNull();
    expect(screen.queryByText(/countdown\.minute/)).toBeNull();
    expect(screen.queryByText(/countdown\.second/)).toBeNull();
  });

  it("keeps an intermediate zero unit when a smaller unit is present", () => {
    render(<HeroSection {...baseProps} weddingDate={futureDate({ d: 2, h: 3, s: 10 })} couplePhoto="" />);
    expect(screen.getByText(/countdown\.day/)).toBeDefined();
    expect(screen.getByText(/countdown\.hour/)).toBeDefined();
    expect(screen.getByText(/countdown\.minute/)).toBeDefined();
    expect(screen.getByText(/countdown\.second/)).toBeDefined();
  });

  it("shows seconds when the wedding is less than a day away", () => {
    render(<HeroSection {...baseProps} weddingDate={futureDate({ h: 4, mi: 5, s: 6 })} couplePhoto="" />);
    expect(screen.queryByText(/countdown\.year/)).toBeNull();
    expect(screen.getByText(/countdown\.hour/)).toBeDefined();
    expect(screen.getByText(/countdown\.minute/)).toBeDefined();
    expect(screen.getByText(/countdown\.second/)).toBeDefined();
  });

  it("shows only days when months are zero", () => {
    render(<HeroSection {...baseProps} weddingDate={futureDate({ d: 10 })} couplePhoto="" />);
    expect(screen.getByText(/countdown\.day/)).toBeDefined();
    expect(screen.queryByText(/countdown\.month/)).toBeNull();
    expect(screen.queryByText(/countdown\.year/)).toBeNull();
  });

  it("shows only days when everything else is zero", () => {
    render(<HeroSection {...baseProps} weddingDate={futureDate({ d: 3 })} couplePhoto="" />);
    expect(screen.getByText(/countdown\.day/)).toBeDefined();
  });

  it("no muestra nunca la lista pública de confirmados (característica retirada)", () => {
    // La lista pública de confirmados se retiró en v2.159: el hero ya no se
    // suscribe a confirmedPeople ni pinta chips, haya opt-in o no.
    render(<HeroSection {...baseProps} weddingDate={null} couplePhoto="" />);
    expect(document.querySelector(".hero-confirmed-people")).toBeNull();
  });
});
