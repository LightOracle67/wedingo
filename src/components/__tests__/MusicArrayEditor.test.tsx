import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({
    addToast: vi.fn(),
    startUploadToast: vi.fn(() => ({
      update: vi.fn(),
      complete: vi.fn(),
      error: vi.fn(),
    })),
  }),
}));

vi.mock("../../lib/music-store", () => ({
  loadAudio: vi.fn(() => Promise.resolve(null)),
  uploadAudio: vi.fn(),
  addAudio: vi.fn(),
  deleteAudio: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

import MusicArrayEditor from "../MusicArrayEditor";

afterEach(cleanup);

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

    const musicStore = await import("../../lib/music-store");
    vi.mocked(musicStore.loadAudio).mockResolvedValue({
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
});
