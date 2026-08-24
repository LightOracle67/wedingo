import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockSetDoc = vi.fn((_ref: unknown, data: Record<string, unknown>) => Promise.resolve(data));
const mockGetDoc = vi.fn<() => Promise<{ exists: () => boolean; data?: () => unknown }>>(() =>
  Promise.resolve({ exists: () => false }),
);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("firebase/firestore", () => ({
  getDoc: () => mockGetDoc(),
  setDoc: (_ref: unknown, data: Record<string, unknown>) => mockSetDoc(_ref, data),
  doc: vi.fn(() => "doc-ref"),
}));
vi.mock("../../../lib/firebase", () => ({ db: "db-mock" }));
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

import PlatformTab from "../PlatformTab";

describe("PlatformTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the maintenance toggle with defaults", async () => {
    render(<PlatformTab />);
    const toggle = (await screen.findByLabelText("platform.maintenanceToggle")) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    expect(screen.getByLabelText("platform.blockedUrls")).toBeInTheDocument();
    expect(screen.getByLabelText("platform.expiringDays")).toBeInTheDocument();
  });

  it("saves settings on save (modo mantenimiento, banner, blocklists)", async () => {
    render(<PlatformTab />);
    const toggle = await screen.findByLabelText("platform.maintenanceToggle");
    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText("platform.globalBanner"), { target: { value: "Mantenimiento programado" } });
    fireEvent.change(screen.getByLabelText("platform.blockedUrls"), { target: { value: "youtube.com, ejemplo.com" } });
    fireEvent.click(screen.getByText("manage.saveConfig"));
    await vi.waitFor(() => expect(mockSetDoc).toHaveBeenCalled());
    const arg = mockSetDoc.mock.calls[0]![1] as Record<string, string>;
    expect(arg.maintenance).toBe("true");
    expect(arg.bannerText).toBe("Mantenimiento programado");
    expect(arg.blockedUrls).toContain("youtube.com");
  });

  it("desactiva una función social (kill-switch) y la guarda", async () => {
    render(<PlatformTab />);
    await screen.findByLabelText("platform.maintenanceToggle");
    fireEvent.click(screen.getByLabelText("giftList.title"));
    fireEvent.click(screen.getByText("manage.saveConfig"));
    await vi.waitFor(() => expect(mockSetDoc).toHaveBeenCalled());
    const arg = mockSetDoc.mock.calls[0]![1] as Record<string, string>;
    expect(arg.disabledFeatures).toContain("gifts");
  });

  it("carga los ajustes existentes (modo mantenimiento y features activas)", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ maintenance: "true", bannerText: "Bienvenidos", disabledFeatures: "gifts,trivia", blockedUrls: "x.com" }),
    });
    render(<PlatformTab />);
    const toggle = await screen.findByLabelText("platform.maintenanceToggle");
    await vi.waitFor(() => expect((toggle as HTMLInputElement).checked).toBe(true));
    expect((screen.getByLabelText("giftList.title") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("trivia.title") as HTMLInputElement).checked).toBe(true);
  });
});
