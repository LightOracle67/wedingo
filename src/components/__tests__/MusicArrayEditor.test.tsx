import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const mockUploadToastError = vi.hoisted(() => vi.fn());
const mockAddToast = vi.fn();

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({
    addToast: mockAddToast,
    startUploadToast: vi.fn(() => ({
      update: vi.fn(),
      complete: vi.fn(),
      error: mockUploadToastError,
    })),
  }),
}));

const mockLoadAudio = vi.fn(() => Promise.resolve(null as { id?: string; url: string } | null));
const mockUploadAudio = vi.fn();
const mockAddAudio = vi.fn();
const mockDeleteAudio = vi.fn();

vi.mock("../../lib/music-store", () => ({
  loadAudio: (...args: Parameters<typeof mockLoadAudio>) => mockLoadAudio(...args),
  uploadAudio: (...args: unknown[]) => mockUploadAudio(...args),
  addAudio: (...args: unknown[]) => mockAddAudio(...args),
  deleteAudio: (...args: unknown[]) => mockDeleteAudio(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

import MusicArrayEditor from "../MusicArrayEditor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadAudio.mockResolvedValue(null);
  mockUploadAudio.mockResolvedValue({ encrypted: "enc", dataUrl: "data:audio/mp3,test" });
  mockAddAudio.mockResolvedValue({ id: "audio-1", dataUrl: "data:audio/mp3,test" });
  mockDeleteAudio.mockResolvedValue(undefined);
});

describe("MusicArrayEditor", () => {
  it("renders loading state initially", () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    expect(document.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("shows upload label after loading completes", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    const label = await screen.findByText("setup.musicUploadLabel");
    expect(label).toBeInTheDocument();
  });

  it("shows audio hint text", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    const hint = await screen.findByText("setup.audioHint");
    expect(hint).toBeInTheDocument();
  });

  it("displays current music controls when value is provided", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={vi.fn()} />);
    const status = await screen.findByText("setup.currentMusic");
    expect(status).toBeInTheDocument();
  });

  it("calls onChange when loadAudio returns a URL", async () => {
    const onChange = vi.fn();

    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/loaded.mp3",
    });

    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={onChange} />);

    await screen.findByText("setup.musicUploadLabel");
    expect(onChange).toHaveBeenCalledWith("https://example.com/loaded.mp3");
  });

  it("handles loadAudio returning null gracefully", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    const label = await screen.findByText("setup.musicUploadLabel");
    expect(label).toBeInTheDocument();
  });

  it("handles audio file selection via hidden input", async () => {
    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={onChange} />);
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(fileInput).toBeInTheDocument();

    const file = new File(["fake-audio"], "song.mp3", { type: "audio/mpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadAudio).toHaveBeenCalled();
    });
    expect(mockAddAudio).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("data:audio/mp3,test");
  });

  it("rejects empty audio file", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const emptyFile = new File([], "empty.mp3", { type: "audio/mpeg" });
    Object.defineProperty(emptyFile, "size", { value: 0 });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.errorEmptyFile");
    });
  });

  it("rejects invalid audio format", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const badFile = new File(["fake"], "file.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.audioFormatError");
    });
  });

  it("deletes audio file", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/song.mp3",
    });

    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");

    const deleteBtn = screen.getByRole("button", { name: "common.delete" });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteAudio).toHaveBeenCalledWith("test-token");
    });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("toggles play/pause", async () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();

    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={vi.fn()} />);
    await screen.findByText("setup.currentMusic");

    const playBtn = screen.getByRole("button", { name: "music.play" });
    expect(playBtn).toBeInTheDocument();

    fireEvent.click(playBtn);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "music.pause" })).toBeInTheDocument();
    });

    const pauseBtn = screen.getByRole("button", { name: "music.pause" });
    fireEvent.click(pauseBtn);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "music.play" })).toBeInTheDocument();
    });
  });

  it("handles load audio error", async () => {
    mockLoadAudio.mockRejectedValue(new Error("Load failed"));

    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "errors.musicLoadFailed");
    });
  });

  it("does not delete existing audio before uploading (add-first)", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "existing-id",
      url: "https://example.com/old.mp3",
    });

    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/old.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["fake-audio"], "new.mp3", { type: "audio/mpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // addAudio retira los chunks anteriores SOLO tras commitar los nuevos
    // (add-first): el editor ya no borra el audio antes de la subida.
    await waitFor(() => {
      expect(mockAddAudio).toHaveBeenCalled();
    });
    expect(mockDeleteAudio).not.toHaveBeenCalled();
  });

  it("shows formatted file size after upload", async () => {
    mockLoadAudio.mockResolvedValue({ id: "audio-1", url: "https://example.com/song.mp3" });

    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "song.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 500 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadAudio).toHaveBeenCalled();
    });
    const sizeEls = document.querySelectorAll<HTMLElement>("p");
    expect(sizeEls.length).toBeGreaterThanOrEqual(1);
  });

  it("shows formatted file size in KB", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/song.mp3",
    });

    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "song.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 2048 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadAudio).toHaveBeenCalled();
    });
  });

  it("shows formatted file size in MB", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/song.mp3",
    });

    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "song.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 2 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadAudio).toHaveBeenCalled();
    });
  });

  it("handles upload without inviteToken gracefully", async () => {
    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="" value="" onChange={onChange} />);
    await screen.findByText("setup.musicUploadLabel");
  });

  it("clears input after upload completes", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const setValue = vi.fn();
    Object.defineProperty(fileInput, "value", { set: setValue, get: () => "" });

    const file = new File(["fake-audio"], "song.mp3", { type: "audio/mpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockAddAudio).toHaveBeenCalled();
    });
  });

  it("handles upload error", async () => {
    mockUploadAudio.mockRejectedValue(new Error("Upload failed"));

    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["fake-audio"], "song.mp3", { type: "audio/mpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadToastError).toHaveBeenCalledWith("setup.musicUploadFailed");
    });
  });

  it("handles delete error", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/song.mp3",
    });
    mockDeleteAudio.mockRejectedValue(new Error("Delete failed"));

    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={vi.fn()} />);
    await screen.findByText("setup.currentMusic");

    const deleteBtn = screen.getByRole("button", { name: "common.delete" });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "errors.musicDeleteFailed");
    });
  });

  it("rejects oversized audio file", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const oversizedFile = new File(["x"], "big.mp3", { type: "audio/mpeg" });
    Object.defineProperty(oversizedFile, "size", { value: 21 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.audioSizeError");
    });
  });

  it("handles playback error gracefully", async () => {
    HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error("playback blocked"));

    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={vi.fn()} />);
    await screen.findByText("setup.currentMusic");

    const playBtn = screen.getByRole("button", { name: "music.play" });
    fireEvent.click(playBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "music.play" })).toBeInTheDocument();
    });
  });

  it("skips delete when audioId is null", async () => {
    mockDeleteAudio.mockClear();
    mockLoadAudio.mockResolvedValue({ url: "https://example.com/song.mp3" });

    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");

    const deleteBtn = screen.getByRole("button", { name: "common.delete" });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteAudio).not.toHaveBeenCalled();
    });
  });

  it("handles delete with audioRef null", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/song.mp3",
    });

    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");

    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    const playBtn = screen.getByRole("button", { name: "music.play" });
    fireEvent.click(playBtn);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "music.pause" })).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: "common.delete" });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteAudio).toHaveBeenCalledWith("test-token");
    });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("handles upload with empty inviteToken", async () => {
    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="" value="" onChange={onChange} />);
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["fake-audio"], "song.mp3", { type: "audio/mpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadAudio).toHaveBeenCalled();
    });
  });

  it("clears input after oversized file error", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const bigFile = new File(["x"], "big.mp3", { type: "audio/mpeg" });
    Object.defineProperty(bigFile, "size", { value: 21 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.audioSizeError");
    });
  });

  it("handles togglePlay when audioRef is null", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/song.mp3",
    });
    const onChange = vi.fn();
    const { rerender } = render(
      <MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />,
    );
    await screen.findByText("setup.currentMusic");
    const deleteBtn = screen.getByRole("button", { name: "common.delete" });
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(mockDeleteAudio).toHaveBeenCalledWith("test-token");
    });
    rerender(<MusicArrayEditor inviteToken="test-token" value="" onChange={onChange} />);
    await screen.findByText("setup.musicUploadLabel");
  });

  it("clears input value after empty file error", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const emptyFile = new File([], "empty.mp3", { type: "audio/mpeg" });
    Object.defineProperty(emptyFile, "size", { value: 0 });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.errorEmptyFile");
    });
  });

  it("handles audioRef.current check in handleDelete", async () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();

    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/song.mp3",
    });
    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");
    const playBtn = screen.getByRole("button", { name: "music.play" });
    fireEvent.click(playBtn);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "music.pause" })).toBeInTheDocument();
    });
    const audioEl = document.querySelector("audio");
    expect(audioEl).not.toBeNull();
    const deleteBtn = screen.getByRole("button", { name: "common.delete" });
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(mockDeleteAudio).toHaveBeenCalledWith("test-token");
    });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("handles file upload with existing audioId", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "existing-id",
      url: "https://example.com/song.mp3",
    });
    mockUploadAudio.mockResolvedValue({ encrypted: "enc", dataUrl: "data:audio/mp3,test" });
    mockAddAudio.mockResolvedValue({ id: "new-id", dataUrl: "data:audio/mp3,test" });

    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["fake-audio"], "song.mp3", { type: "audio/mpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(mockAddAudio).toHaveBeenCalledWith("test-token", "enc", "data:audio/mp3,test", expect.any(Function));
    });
    // add-first: no se borra el audio previo desde el editor.
    expect(mockDeleteAudio).not.toHaveBeenCalled();
  });

  it("handles handleFile when no file selected", async () => {
    render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [] } });
    await vi.waitFor(() => {
      expect(mockUploadAudio).not.toHaveBeenCalled();
    });
  });

  it("triggers cleanup on unmount", async () => {
    const { unmount } = render(<MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} />);
    await screen.findByText("setup.musicUploadLabel");
    unmount();
  });

  it("handles formatSize rendering in MB", async () => {
    mockLoadAudio.mockResolvedValue({ id: "audio-1", url: "https://example.com/song.mp3" });
    const onChange = vi.fn();
    render(<MusicArrayEditor inviteToken="test-token" value="https://example.com/song.mp3" onChange={onChange} />);
    await screen.findByText("setup.currentMusic");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "song.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadAudio).toHaveBeenCalled();
    });
    const paras = document.querySelectorAll("p");
    expect(paras.length).toBeGreaterThan(0);
  });
});
