import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const mockUseApp = vi.fn();
vi.mock("../../contexts", () => ({
  useApp: (...args: unknown[]) => mockUseApp(...args),
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
  mockUseApp.mockReset();
});

describe("PrintPage", () => {
  it("shows loading state when config is loading", () => {
    mockUseApp.mockReturnValue({
      config: { firstName: "", secondName: "" },
      isConfigLoading: true,
    });

    render(<PrintPage />);
    expect(screen.getByText("print.preparing")).toBeDefined();
  });

  it("shows loading state before loaded timer fires", () => {
    mockUseApp.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    expect(screen.getByText("print.preparing")).toBeDefined();
  });

  it("renders couple names after loading", () => {
    mockUseApp.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText("John", { exact: false })).toBeDefined();
    expect(screen.getByText("Jane", { exact: false })).toBeDefined();
  });

  it("renders wedding details when provided", () => {
    mockUseApp.mockReturnValue({
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
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText("Alice", { exact: false })).toBeDefined();
    expect(screen.getByText("Bob", { exact: false })).toBeDefined();
  });

  it("renders hero eyebrow text", () => {
    mockUseApp.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText("hero.eyebrow")).toBeDefined();
  });

  it("calls window.print after loading and fonts ready", async () => {
    mockUseApp.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => { vi.advanceTimersByTime(200); });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => { vi.advanceTimersByTime(400); });
    await act(async () => {
      await Promise.resolve();
    });

    expect(window.print).toHaveBeenCalled();
  });

  it("sets window.onafterprint to window.close", async () => {
    mockUseApp.mockReturnValue({
      config: { firstName: "John", secondName: "Jane", theme: "golden" },
      isConfigLoading: false,
    });

    render(<PrintPage />);
    act(() => { vi.advanceTimersByTime(200); });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => { vi.advanceTimersByTime(400); });
    await act(async () => {
      await Promise.resolve();
    });

    expect(typeof window.onafterprint).toBe("function");
  });
});
