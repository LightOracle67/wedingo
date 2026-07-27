import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const mockAddToast = vi.fn();

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({
    addToast: mockAddToast,
    startUploadToast: vi.fn(() => ({
      update: vi.fn(),
      complete: vi.fn(),
      error: vi.fn(),
    })),
  }),
}));

const mockLoadAudio = vi.fn(() => Promise.resolve(null));
const mockUploadAudio = vi.fn();
const mockAddAudio = vi.fn();
const mockDeleteAudio = vi.fn();

vi.mock("../../lib/music-store", () => ({
  loadAudio: (...args: unknown[]) => mockLoadAudio(...args),
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
  mockLoadAudio.mockResolvedValue(null);
  mockUploadAudio.mockResolvedValue({ encrypted: "enc", dataUrl: "data:audio/mp3,test" });
  mockAddAudio.mockResolvedValue({ id: "audio-1", dataUrl: "data:audio/mp3,test" });
  mockDeleteAudio.mockResolvedValue(undefined);
});

describe("MusicArrayEditor", () => {
  const t = (key: string) => key;

  it("renders loading state initially", () => {
    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} t={t} />
    );
    expect(document.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("shows upload label after loading completes", async () => {
    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} t={t} />
    );
    const label = await screen.findByText("setup.musicUploadLabel");
    expect(label).toBeInTheDocument();
  });

  it("shows audio hint text", async () => {
    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} t={t} />
    );
    const hint = await screen.findByText("setup.audioHint");
    expect(hint).toBeInTheDocument();
  });

  it("displays current music controls when value is provided", async () => {
    render(
      <MusicArrayEditor
        inviteToken="test-token"
        value="https://example.com/song.mp3"
        onChange={vi.fn()}
        t={t}
      />
    );
    const status = await screen.findByText("setup.currentMusic");
    expect(status).toBeInTheDocument();
  });

  it("calls onChange when loadAudio returns a URL", async () => {
    const onChange = vi.fn();

    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/loaded.mp3",
    });

    render(
      <MusicArrayEditor
        inviteToken="test-token"
        value=""
        onChange={onChange}
        t={t}
      />
    );

    await screen.findByText("setup.musicUploadLabel");
    expect(onChange).toHaveBeenCalledWith("https://example.com/loaded.mp3");
  });

  it("handles loadAudio returning null gracefully", async () => {
    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} t={t} />
    );
    const label = await screen.findByText("setup.musicUploadLabel");
    expect(label).toBeInTheDocument();
  });

  it("handles audio file selection via hidden input", async () => {
    const onChange = vi.fn();
    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={onChange} t={t} />
    );
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
    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} t={t} />
    );
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
    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} t={t} />
    );
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
    render(
      <MusicArrayEditor
        inviteToken="test-token"
        value="https://example.com/song.mp3"
        onChange={onChange}
        t={t}
      />
    );
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

    render(
      <MusicArrayEditor
        inviteToken="test-token"
        value="https://example.com/song.mp3"
        onChange={vi.fn()}
        t={t}
      />
    );
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

  it("handles upload error", async () => {
    mockUploadAudio.mockRejectedValue(new Error("Upload failed"));

    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} t={t} />
    );
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["fake-audio"], "song.mp3", { type: "audio/mpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalled();
    });
  });

  it("handles delete error", async () => {
    mockLoadAudio.mockResolvedValue({
      id: "audio-1",
      url: "https://example.com/song.mp3",
    });
    mockDeleteAudio.mockRejectedValue(new Error("Delete failed"));

    render(
      <MusicArrayEditor
        inviteToken="test-token"
        value="https://example.com/song.mp3"
        onChange={vi.fn()}
        t={t}
      />
    );
    await screen.findByText("setup.currentMusic");

    const deleteBtn = screen.getByRole("button", { name: "common.delete" });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "errors.musicDeleteFailed");
    });
  });

  it("rejects oversized audio file", async () => {
    render(
      <MusicArrayEditor inviteToken="test-token" value="" onChange={vi.fn()} t={t} />
    );
    await screen.findByText("setup.musicUploadLabel");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const oversizedFile = new File(["x"], "big.mp3", { type: "audio/mpeg" });
    Object.defineProperty(oversizedFile, "size", { value: 21 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.audioSizeError");
    });
  });

});
