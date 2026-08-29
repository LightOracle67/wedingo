import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockSetDoc = vi.fn((_ref: unknown, data: Record<string, unknown>) => Promise.resolve(data));
const mockGetDoc = vi.fn<() => Promise<{ exists: () => boolean; data?: () => unknown }>>(() =>
  Promise.resolve({ exists: () => false }),
);
const mockAddToast = vi.fn();

// Datos de ajustes iniciales: permiten inyectar un 'true' de mantenimiento y
// un banner ya activo para ejercitar las ramas `checked` del arranque.
const mockSettings = vi.fn<() => Record<string, string>>(() => ({
  maintenance: "false",
  bannerEnabled: "false",
  bannerText: "",
  blockedUrls: "",
  blockedTokens: "",
  expiringDays: "14",
}));

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
  useToast: () => ({ addToast: mockAddToast }),
}));
vi.mock("../../../lib/platform-settings", () => ({
  usePlatformSettings: () => ({ settings: mockSettings(), reload: vi.fn() }),
}));

import PlatformTab from "../PlatformTab";

describe("PlatformTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.mockReturnValue({
      maintenance: "false",
      bannerEnabled: "false",
      bannerText: "",
      blockedUrls: "",
      blockedTokens: "",
      expiringDays: "14",
    });
  });

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

  it("parte con el mantenimiento y el banner ya activos (ramas checked verdaderas)", async () => {
    mockSettings.mockReturnValue({
      maintenance: "true",
      bannerEnabled: "true",
      bannerText: "Aviso",
      blockedUrls: "",
      blockedTokens: "",
      expiringDays: "30",
    });
    render(<PlatformTab />);
    const maint = (await screen.findByLabelText("platform.maintenanceToggle")) as HTMLInputElement;
    const banner = screen.getByLabelText("platform.bannerToggle") as HTMLInputElement;
    expect(maint.checked).toBe(true);
    expect(banner.checked).toBe(true);
    expect((screen.getByLabelText("platform.globalBanner") as HTMLTextAreaElement).value).toBe("Aviso");
  });

  it("avisa con error si el guardado falla (rama catch)", async () => {
    mockSetDoc.mockRejectedValueOnce(new Error("boom"));
    render(<PlatformTab />);
    await screen.findByLabelText("platform.maintenanceToggle");
    fireEvent.click(screen.getByText("manage.saveConfig"));
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("error", "errors.generic"));
  });

  it("apaga el banner y recorta el texto (rama onChange false + slice)", () => {
    mockSettings.mockReturnValue({
      maintenance: "false",
      bannerEnabled: "true",
      bannerText: "Aviso largo",
      blockedUrls: "",
      blockedTokens: "",
      expiringDays: "14",
    });
    render(<PlatformTab />);
    const banner = screen.getByLabelText("platform.bannerToggle") as HTMLInputElement;
    fireEvent.click(banner);
    fireEvent.change(screen.getByLabelText("platform.globalBanner"), { target: { value: "B".repeat(510) } });
    expect((screen.getByLabelText("platform.globalBanner") as HTMLTextAreaElement).value).toHaveLength(500);
  });
});
