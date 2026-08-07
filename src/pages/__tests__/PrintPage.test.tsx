import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const mockUseConfig = vi.fn();
vi.mock("../../contexts", () => ({
  useConfig: (...args: unknown[]) => mockUseConfig(...args),
}));

vi.mock("../../lib/invite-messages", () => ({
  randomMessage: () => "A beautiful wedding message",
}));

import PrintPage from "../PrintPage";

beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve(new Set()) },
    writable: true,
    configurable: true,
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  window.print = vi.fn();
  window.close = vi.fn();
  mockUseConfig.mockReset();
});

describe("PrintPage", () => {
  it("shows loading state when config is loading", () => {
    mockUseConfig.mockReturnValue({
      config: { firstName: "", secondName: "" },
      isConfigLoading: true,
    });

    render(<PrintPage />);
    expect(screen.getByText("print.preparing")).toBeDefined();
  });

  it("shows loading state before loaded timer fires", () => {
    mockUseConfig.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    expect(screen.getByText("print.preparing")).toBeDefined();
  });

  it("renders couple names after loading", () => {
    mockUseConfig.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("John", { exact: false })).toBeDefined();
    expect(screen.getByText("Jane", { exact: false })).toBeDefined();
  });

  it("renders wedding details when provided", () => {
    mockUseConfig.mockReturnValue({
      config: {
        firstName: "Alice",
        secondName: "Bob",
        theme: "golden",
        weddingDay: "15",
        weddingMonth: "junio",
        weddingYear: "2025",
        weddingHour: "18",
        weddingMinute: "30",
        weddingPlace: "Iglesia de San Juan",
      },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("Alice", { exact: false })).toBeDefined();
    expect(screen.getByText("Bob", { exact: false })).toBeDefined();
  });

  it("renders with an unknown wedding month without showing a date", () => {
    mockUseConfig.mockReturnValue({
      config: {
        firstName: "Alice",
        secondName: "Bob",
        theme: "golden",
        weddingDay: "15",
        weddingMonth: "mes-invalido",
        weddingYear: "2025",
        weddingHour: "",
        weddingMinute: "",
        weddingPlace: "Iglesia",
      },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("Alice", { exact: false })).toBeDefined();
  });

  it("does not print an invalid date (31 February rolls over)", () => {
    mockUseConfig.mockReturnValue({
      config: {
        firstName: "Alice",
        secondName: "Bob",
        theme: "golden",
        weddingDay: "31",
        weddingMonth: "febrero",
        weddingYear: "2025",
        weddingHour: "18",
        weddingMinute: "30",
        weddingPlace: "Iglesia",
      },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // La fecha invÃ¡lida no se muestra: no hay "31 de febrero" ni el rollover.
    expect(screen.queryByText(/marzo|febrero/i)).toBeNull();
    expect(screen.getByText("Alice", { exact: false })).toBeDefined();
  });

  it("renders without a wedding date", () => {
    mockUseConfig.mockReturnValue({
      config: { firstName: "Alice", secondName: "Bob", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("Alice", { exact: false })).toBeDefined();
  });

  it("renders hero eyebrow text", () => {
    mockUseConfig.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("hero.eyebrow")).toBeDefined();
  });

  it("calls window.print after loading and fonts ready", async () => {
    mockUseConfig.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(window.print).toHaveBeenCalled();
  });

  it("sets window.onafterprint to window.close", async () => {
    mockUseConfig.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(typeof window.onafterprint).toBe("function");
  });

  it("closes the window after printing when it was opened via window.open", async () => {
    mockUseConfig.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });
    const close = vi.fn();
    const origOpener = window.opener;
    Object.defineProperty(window, "opener", { value: {}, configurable: true });
    Object.defineProperty(window, "close", { value: close, configurable: true });

    render(<PrintPage />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Se dispara el onafterprint: con window.opener presente, cierra la pestaÃ±a.
    window.onafterprint?.(new Event("afterprint"));
    expect(close).toHaveBeenCalled();
    Object.defineProperty(window, "opener", { value: origOpener, configurable: true });
  });
});
