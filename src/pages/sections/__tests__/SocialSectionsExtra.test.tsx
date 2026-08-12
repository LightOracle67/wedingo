/**
 * SocialSectionsExtra.test.tsx — Cobertura y accesibilidad de las secciones
 * sociales que quedaban al 0%: DayPhotos, Mailbox, Toasts, VenueMap y
 * VoiceNotes. Cada sección se renderiza, se ejercita su interacción principal
 * y se verifica con axe-core que no hay violaciones críticas/serias.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import axe from "axe-core";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// useInviteSubcollection se controla por test (items/add/busy).
const mockSub = vi.fn();
vi.mock("../../../hooks/useInviteSubcollection", () => ({
  useInviteSubcollection: (...args: unknown[]) => mockSub(...args),
}));

// crypto: thumbnails/upload de DayPhotos.
vi.mock("../../../lib/crypto-utils", () => ({
  decrypt: vi.fn(async () => "data:image/webp;base64,AAA"),
  encrypt: vi.fn(async () => "enc"),
}));

// image-utils arrastra i18n real (init con recursos): se mockea para que
// DayPhotosSection no dependa de los locales en el test.
vi.mock("../../../lib/image-utils", () => ({
  compressImage: vi.fn(async () => "data:image/webp;base64,AAA"),
}));

// voice-store: lista/carga/borra notas de voz.
const mockVoiceList = vi.fn();
const mockVoiceLoad = vi.fn();
const mockVoiceAdd = vi.fn();
const mockVoiceDelete = vi.fn();
vi.mock("../../../lib/voice-store", () => ({
  listVoiceNotes: (...a: unknown[]) => mockVoiceList(...a),
  loadVoiceNote: (...a: unknown[]) => mockVoiceLoad(...a),
  addVoiceNote: (...a: unknown[]) => mockVoiceAdd(...a),
  deleteVoiceNote: (...a: unknown[]) => mockVoiceDelete(...a),
}));

const mockGetDocs = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: vi.fn(() => "col"),
  doc: vi.fn(() => "doc-ref"),
}));
vi.mock("../../../lib/firebase", () => ({ db: "db-mock" }));
const mockAddToast = vi.fn();
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));
vi.mock("../../../contexts", () => ({
  useAuth: () => ({ isAdminTokenLoggedIn: true }),
}));

import DayPhotosSection from "../DayPhotosSection";
import MailboxSection from "../MailboxSection";
import ToastsSection from "../ToastsSection";
import VenueMapSection from "../VenueMapSection";
import VoiceNotesSection from "../VoiceNotesSection";

async function runAxe(container: HTMLElement) {
  const results = await axe.run(container);
  return results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

/** Valor por defecto de useInviteSubcollection. */
const defaultSub = () => ({
  items: [],
  load: vi.fn(() => Promise.resolve()),
  add: vi.fn(async () => "new-id"),
  busy: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockSub.mockReturnValue(defaultSub());
  mockGetDocs.mockResolvedValue({ docs: [], size: 0 });
  mockVoiceList.mockResolvedValue([]);
  mockVoiceLoad.mockResolvedValue("");
});

describe("MailboxSection", () => {
  it("envía un mensaje privado y muestra el agradecimiento", async () => {
    const add = vi.fn(async () => "new-id");
    mockSub.mockReturnValue({ items: [], load: vi.fn(), add, busy: false });
    render(<MailboxSection inviteToken="tok" />);
    const name = screen.getByLabelText("mailbox.namePlaceholder");
    const msg = screen.getByLabelText("mailbox.messagePlaceholder");
    fireEvent.change(name, { target: { value: "Ana" } });
    fireEvent.change(msg, { target: { value: "Felicidades" } });
    fireEvent.click(screen.getByText("mailbox.send"));
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith({ guestName: "Ana", message: "Felicidades" }));
    expect(await screen.findByText("mailbox.thanks")).toBeInTheDocument();
  });

  it("no envía mensajes vacíos (botón deshabilitado)", () => {
    render(<MailboxSection inviteToken="tok" />);
    expect(screen.getByText("mailbox.send")).toBeDisabled();
  });

  it("no tiene violaciones de accesibilidad", async () => {
    const { container } = render(<MailboxSection inviteToken="tok" />);
    expect(await runAxe(container)).toHaveLength(0);
  });
});

describe("ToastsSection", () => {
  it("apunta a un brindis con hora opcional", async () => {
    const add = vi.fn(async () => "new-id");
    mockSub.mockReturnValue({ items: [], load: vi.fn(), add, busy: false });
    render(<ToastsSection inviteToken="tok" />);
    fireEvent.change(screen.getByLabelText("toasts.namePlaceholder"), { target: { value: "Luis" } });
    fireEvent.change(screen.getByLabelText("toasts.timePlaceholder"), { target: { value: "22:00" } });
    fireEvent.click(screen.getByText("toasts.signUp"));
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith({ guestName: "Luis", time: "22:00" }));
  });

  it("lista los brindis ya apuntados", () => {
    mockSub.mockReturnValue({
      ...defaultSub(),
      items: [{ id: "t1", guestName: "Sara", time: "21:30" }],
    });
    render(<ToastsSection inviteToken="tok" />);
    expect(screen.getByText("Sara")).toBeInTheDocument();
    expect(screen.getByText(/21:30/)).toBeInTheDocument();
  });

  it("no tiene violaciones de accesibilidad", async () => {
    const { container } = render(<ToastsSection inviteToken="tok" />);
    expect(await runAxe(container)).toHaveLength(0);
  });
});

describe("DayPhotosSection", () => {
  it("revela el thumbnail descifrado de una foto existente", async () => {
    mockSub.mockReturnValue({
      ...defaultSub(),
      items: [{ id: "p1", guestName: "Ana", data: "enc-data" }],
    });
    const { container } = render(<DayPhotosSection inviteToken="tok" />);
    // Botón 👁 para revelar.
    const revealBtn = container.querySelector("button[aria-label='dayPhotos.reveal']");
    expect(revealBtn).not.toBeNull();
    fireEvent.click(revealBtn!);
    await vi.waitFor(() => expect(container.querySelector("img")).not.toBeNull());
  });

  it("no tiene violaciones de accesibilidad (con foto)", async () => {
    mockSub.mockReturnValue({
      ...defaultSub(),
      items: [{ id: "p1", guestName: "Ana", data: "enc" }],
    });
    const { container } = render(<DayPhotosSection inviteToken="tok" />);
    expect(await runAxe(container)).toHaveLength(0);
  });
});

describe("VenueMapSection", () => {
  it("renderiza los puntos del recinto cargados de Firestore", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "v1", data: () => ({ label: "Entrada", x: 20, y: 30, color: "#f00" }) },
        { id: "v2", data: () => ({ label: "Pista", x: 70, y: 60, color: "#0f0" }) },
      ],
    });
    const { container } = render(<VenueMapSection inviteToken="tok" background="" />);
    expect(await screen.findByText("Entrada")).toBeInTheDocument();
    expect(screen.getByText("Pista")).toBeInTheDocument();
    expect(await runAxe(container)).toHaveLength(0);
  });

  it("no renderiza nada sin puntos", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { container } = render(<VenueMapSection inviteToken="tok" background="" />);
    expect(container.querySelector(".venue-map")).toBeNull();
  });
});

describe("VoiceNotesSection", () => {
  it("lista las notas de voz guardadas", async () => {
    mockVoiceList.mockResolvedValue([{ id: "n1", noteId: "n1", guestName: "Ana" }]);
    mockVoiceLoad.mockResolvedValue("data:audio/webm;base64,AAA");
    const { container } = render(<VoiceNotesSection inviteToken="tok" />);
    await vi.waitFor(() => expect(screen.getByText(/Ana/)).toBeInTheDocument());
    expect(await runAxe(container)).toHaveLength(0);
  });

  it("muestra el estado vacío sin notas", async () => {
    mockVoiceList.mockResolvedValue([]);
    render(<VoiceNotesSection inviteToken="tok" />);
    expect(await screen.findByText("voiceNotes.empty")).toBeInTheDocument();
  });

  it("muestra la fecha de creación de la nota cuando existe", async () => {
    mockVoiceList.mockResolvedValue([
      { id: "n1", noteId: "n1", guestName: "Ana", createdAt: "2026-08-01T10:00:00.000Z" },
    ]);
    render(<VoiceNotesSection inviteToken="tok" />);
    await vi.waitFor(() => expect(screen.getByText(/Ana/)).toBeInTheDocument());
    // El año de creación se muestra (formato depende del locale de jsdom).
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("reproduce una nota de voz", async () => {
    mockVoiceList.mockResolvedValue([{ id: "n1", noteId: "n1", guestName: "Ana" }]);
    mockVoiceLoad.mockResolvedValue("data:audio/webm;base64,AAA");
    render(<VoiceNotesSection inviteToken="tok" />);
    const btn = await screen.findByText("▶");
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    await vi.waitFor(() => expect(mockVoiceLoad).toHaveBeenCalled());
  });

  it("borra una nota de voz tras confirmar", async () => {
    mockVoiceList.mockResolvedValue([{ id: "n1", noteId: "n1", guestName: "Ana" }]);
    window.confirm = vi.fn(() => true);
    render(<VoiceNotesSection inviteToken="tok" />);
    await vi.waitFor(() => expect(screen.getByText(/Ana/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("✕"));
    await vi.waitFor(() => expect(mockVoiceDelete).toHaveBeenCalledWith("tok", "n1"));
  });

  it("no borra la nota si el usuario cancela", async () => {
    mockVoiceList.mockResolvedValue([{ id: "n1", noteId: "n1", guestName: "Ana" }]);
    window.confirm = vi.fn(() => false);
    render(<VoiceNotesSection inviteToken="tok" />);
    await vi.waitFor(() => expect(screen.getByText(/Ana/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("✕"));
    await new Promise((r) => setTimeout(r, 30));
    expect(mockVoiceDelete).not.toHaveBeenCalled();
  });

  it("muestra error si la nota no se puede descifrar al reproducir", async () => {
    mockVoiceList.mockResolvedValue([{ id: "n1", noteId: "n1", guestName: "Ana" }]);
    mockVoiceLoad.mockResolvedValue("");
    render(<VoiceNotesSection inviteToken="tok" />);
    const btn = await screen.findByText("▶");
    fireEvent.click(btn);
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("error", "voiceNotes.playError"));
  });
});

describe("VoiceNotesSection: grabación", () => {
  beforeEach(() => {
    mockAddToast.mockClear();
  });

  it("no puede grabar sin micrófono (error manejado)", async () => {
    // jsdom no expone mediaDevices de forma fiable: el acceso lanza y el
    // componente muestra el aviso de error del micrófono.
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => Promise.reject(new Error("denied"))) },
    });
    render(<VoiceNotesSection inviteToken="tok" />);
    fireEvent.click(await screen.findByText("voiceNotes.record"));
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("error", "voiceNotes.micError"));
  });
});

describe("DayPhotosSection: subida", () => {
  it("comprime, cifra y sube la foto elegida", async () => {
    const { compressImage } = await import("../../../lib/image-utils");
    const { encrypt } = await import("../../../lib/crypto-utils");
    const add = vi.fn(async () => "new-id");
    mockSub.mockReturnValue({ items: [], load: vi.fn(), add, busy: false });
    render(<DayPhotosSection inviteToken="tok" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "foto.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await vi.waitFor(() => expect(compressImage).toHaveBeenCalled());
    await vi.waitFor(() => expect(encrypt).toHaveBeenCalled());
    await vi.waitFor(() => expect(add).toHaveBeenCalled());
  });

  it("no sube archivos que no sean imágenes", async () => {
    const { compressImage } = await import("../../../lib/image-utils");
    const add = vi.fn(async () => "new-id");
    mockSub.mockReturnValue({ items: [], load: vi.fn(), add, busy: false });
    render(<DayPhotosSection inviteToken="tok" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "nota.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(compressImage).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });
});
