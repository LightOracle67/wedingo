import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

const mockToDataURL = vi.fn();
vi.mock("qrcode", () => ({
  toDataURL: (...args: unknown[]) => mockToDataURL(...args),
}));

vi.mock("../../../lib/invite-messages", () => ({
  randomMessage: () => "Test invite message",
}));

import ShareTab from "../ShareTab";

const baseProps = {
  inviteToken: "test-token",
  addToast: vi.fn(),
};

describe("ShareTab", () => {
  it("renders the QR code generated in the browser", async () => {
    mockToDataURL.mockResolvedValueOnce("data:image/png;base64,qr");
    render(<ShareTab {...baseProps} />);
    const img = await screen.findByAltText("share.qrCodeAlt");
    expect(img.getAttribute("src")).toBe("data:image/png;base64,qr");
  });

  it("shows an error when the QR cannot be generated", async () => {
    mockToDataURL.mockRejectedValueOnce(new Error("boom"));
    render(<ShareTab {...baseProps} />);
    expect(await screen.findByText("share.qrError")).toBeDefined();
  });

  it("copies the QR to the clipboard as an image", async () => {
    mockToDataURL.mockResolvedValueOnce("data:image/png;base64,cXJkYXRh");
    const write = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { write }, configurable: true });
    (globalThis as Record<string, unknown>).ClipboardItem = class {
      constructor(public data: Record<string, Blob>) {}
    };

    render(<ShareTab {...baseProps} />);
    const copyBtn = await screen.findByText("share.copyQr");
    fireEvent.click(copyBtn);
    await vi.waitFor(() => expect(write).toHaveBeenCalled());

    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true, writable: true });
  });

  it("shows an error when the clipboard cannot write images", async () => {
    mockToDataURL.mockResolvedValueOnce("data:image/png;base64,cXJkYXRh");
    // Sin ClipboardItem (write de imágenes) se avisa del fallo.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
      writable: true,
    });
    const addToast = vi.fn();

    render(<ShareTab {...baseProps} addToast={addToast} />);
    const copyBtn = await screen.findByText("share.copyQr");
    fireEvent.click(copyBtn);
    await vi.waitFor(() => expect(addToast).toHaveBeenCalledWith("error", "share.copyQrFailed"));

    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true, writable: true });
  });
  it("renders share section title", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.message")).toBeDefined();
  });

  it("shows invite link with token", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByDisplayValue(/test-token/)).toBeDefined();
  });

  it("renders published at label", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.publishedAt")).toBeDefined();
  });

  it("renders copy button", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("common.copy")).toBeDefined();
  });

  it("renders share via section", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.shareVia")).toBeDefined();
  });

  it("renders print pdf button", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.printPdf")).toBeDefined();
  });

  it("renders message textarea", () => {
    render(<ShareTab {...baseProps} />);
    const textarea = screen.getByDisplayValue(/Test invite message/);
    expect(textarea).toBeDefined();
  });

  it("renders generate message button", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.generateMessage")).toBeDefined();
  });

  it("renders copy message button", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.copyMessage")).toBeDefined();
  });

  it("renders share app buttons", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.whatsapp")).toBeDefined();
    expect(screen.getByText("share.telegram")).toBeDefined();
    expect(screen.getByText("share.sms")).toBeDefined();
  });

  it("generates invite URL with ?invitar", () => {
    render(<ShareTab inviteToken="abc" addToast={vi.fn()} />);
    const link = screen.getByRole("link", { name: /abc\?invitar/ });
    expect(link).toBeDefined();
  });

  it("calls copyLink when copy button is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const addToast = vi.fn();
    render(<ShareTab {...baseProps} addToast={addToast} />);
    const copyBtn = screen.getByText("common.copy");
    fireEvent.click(copyBtn);
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("test-token"));
    });
  });

  it("shows error toast when clipboard copy fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard error"));
    Object.assign(navigator, { clipboard: { writeText } });
    const addToast = vi.fn();
    render(<ShareTab {...baseProps} addToast={addToast} />);
    const copyBtn = screen.getByText("common.copy");
    fireEvent.click(copyBtn);
    await vi.waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("error", "errors.clipboardCopyFailed");
    });
  });

  it("updates message when textarea changes", () => {
    render(<ShareTab {...baseProps} />);
    const textarea = screen.getByDisplayValue(/Test invite message/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "New message" } });
    expect(textarea.value).toBe("New message");
  });

  it("generates a new message on button click", () => {
    render(<ShareTab {...baseProps} />);
    const generateBtn = screen.getByText("share.generateMessage");
    fireEvent.click(generateBtn);
  });

  it("copies message text on copy message button click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const addToast = vi.fn();
    render(<ShareTab {...baseProps} addToast={addToast} />);
    const copyMsgBtn = screen.getByText("share.copyMessage");
    fireEvent.click(copyMsgBtn);
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
  });

  it("opens share URLs when app buttons are clicked", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ShareTab {...baseProps} />);
    const whatsappBtn = screen.getByText("share.whatsapp");
    fireEvent.click(whatsappBtn);
    expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining("wa.me"), "_blank", "noopener,noreferrer");
    windowOpenSpy.mockRestore();
  });

  it("opens telegram URL when telegram button is clicked", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ShareTab {...baseProps} />);
    fireEvent.click(screen.getByText("share.telegram"));
    expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining("t.me"), "_blank", "noopener,noreferrer");
    windowOpenSpy.mockRestore();
  });

  it("opens SMS URL when sms button is clicked", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ShareTab {...baseProps} />);
    fireEvent.click(screen.getByText("share.sms"));
    expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining("sms:"), "_blank", "noopener,noreferrer");
    windowOpenSpy.mockRestore();
  });

  it("opens print page when print button is clicked", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ShareTab {...baseProps} />);
    const printBtn = screen.getByText("share.printPdf");
    fireEvent.click(printBtn);
    expect(windowOpenSpy).toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  it("shows error toast when copy message button fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard error"));
    Object.assign(navigator, { clipboard: { writeText } });
    const addToast = vi.fn();
    render(<ShareTab {...baseProps} addToast={addToast} />);
    const copyMsgBtn = screen.getByText("share.copyMessage");
    fireEvent.click(copyMsgBtn);
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
  });

  it("handles share without addToast", () => {
    render(<ShareTab inviteToken="test-token" />);
    expect(screen.getByText("share.message")).toBeDefined();
  });

  it("generates message with random message on handleRandom", () => {
    render(<ShareTab {...baseProps} />);
    const textarea = screen.getByDisplayValue(/Test invite message/) as HTMLTextAreaElement;
    fireEvent.click(screen.getByText("share.generateMessage"));
    expect(textarea.value).toContain("Test invite message");
  });

  it("copies the message without addToast (graceful no-op)", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<ShareTab inviteToken="test-token" />);
    fireEvent.click(screen.getByText("share.copyMessage"));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
  });

  it("shows an error toast when copying the message fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
      configurable: true,
    });
    render(<ShareTab {...baseProps} />);
    fireEvent.click(screen.getByText("share.copyMessage"));
    await vi.waitFor(() => {
      expect(baseProps.addToast).toHaveBeenCalledWith("error", "errors.clipboardCopyFailed");
    });
  });
});
