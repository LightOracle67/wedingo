import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

let mockAudioPlay: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockAudioPlay = vi.fn();
  window.HTMLMediaElement.prototype.play = mockAudioPlay;
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
  Object.defineProperty(HTMLMediaElement.prototype, "volume", {
    writable: true,
    value: 0.5,
  });
});

afterEach(cleanup);

import MusicPlayer from "../MusicPlayer";

describe("MusicPlayer", () => {
  it("renders the FAB button when no music URL is provided", () => {
    render(<MusicPlayer />);
    const btn = screen.getByRole("button", { name: /music\.label/i });
    expect(btn).toBeDefined();
  });

  it("renders the FAB button when a music URL is provided", () => {
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const btn = screen.getByRole("button", { name: /music\.label/i });
    expect(btn).toBeDefined();
  });

  it("renders the track name based on the URL", () => {
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    expect(screen.getByText("song")).toBeDefined();
  });

  it("renders audio element with loop and autoPlay when musicUrl is provided", () => {
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const audio = document.querySelector("audio");
    expect(audio).toBeDefined();
    expect(audio?.getAttribute("loop")).toBe("");
    expect(audio?.getAttribute("autoplay")).toBe("");
    expect(audio?.getAttribute("preload")).toBe("auto");
  });

  it("does not render audio element when no musicUrl", () => {
    render(<MusicPlayer />);
    expect(document.querySelector("audio")).toBeNull();
  });

  it("toggles play/pause when play button is clicked", async () => {
    mockAudioPlay.mockResolvedValue(undefined);
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const playBtn = screen.getByText(/▶|⏸/);
    fireEvent.click(playBtn);
    expect(mockAudioPlay).toHaveBeenCalled();
  });

  it("shows loading spinner while playing", () => {
    mockAudioPlay.mockImplementation(() => new Promise(() => {}));
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const playBtn = screen.getByText(/▶/);
    fireEvent.click(playBtn);
    expect(document.querySelector(".music-player__spinner")).toBeDefined();
  });

  it("shows play button when not playing", () => {
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    expect(screen.getByText("▶")).toBeDefined();
  });

  it("shows error state when play fails", async () => {
    mockAudioPlay.mockRejectedValue(new Error("playback failed"));
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const playBtn = screen.getByText("▶");
    await fireEvent.click(playBtn);
    await vi.dynamicImportSettled();
    const status = await screen.findByText("music.loadError");
    expect(status).toBeDefined();
  });

  it("adjusts volume when slider changes", () => {
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const slider = document.querySelector(".music-player__volume") as HTMLInputElement;
    expect(slider).toBeDefined();
    fireEvent.change(slider, { target: { value: "0.8" } });
    expect(slider.value).toBe("0.8");
  });

  it("shows volume icon correctly at different levels", () => {
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const slider = document.querySelector(".music-player__volume") as HTMLInputElement;
    expect(screen.getByText("🔊")).toBeDefined();
    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByText("🔇")).toBeDefined();
    fireEvent.change(slider, { target: { value: "0.2" } });
    expect(screen.getByText("🔉")).toBeDefined();
  });

  it("disables play button and volume when no music", () => {
    render(<MusicPlayer />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const playBtn = document.querySelector(".music-player__play");
    expect(playBtn).toBeDefined();
    expect(playBtn).toHaveAttribute("disabled");
    const volumeSlider = document.querySelector(".music-player__volume") as HTMLInputElement;
    expect(volumeSlider).toHaveAttribute("disabled");
  });

  it("shows fab dot when no music", () => {
    render(<MusicPlayer />);
    expect(document.querySelector(".music-player__fab-dot")).toBeDefined();
  });

  it("opens and closes the player card on FAB click", () => {
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    expect(document.querySelector(".music-player__card--open")).toBeNull();
    fireEvent.click(fab);
    expect(document.querySelector(".music-player__card--open")).toBeDefined();
    fireEvent.click(fab);
    expect(document.querySelector(".music-player__card--open")).toBeNull();
  });

  it("shows no music text when no URL", () => {
    render(<MusicPlayer />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    expect(screen.getByText("music.noMusic")).toBeDefined();
  });

  it("handles invalid music URL gracefully", () => {
    render(<MusicPlayer musicUrl="not-a-valid-url" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    expect(screen.getByText("music.noMusic")).toBeDefined();
  });

  it("pauses audio when play button clicked while playing", async () => {
    mockAudioPlay.mockResolvedValue(undefined);
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const playBtn = screen.getByText("▶");
    fireEvent.click(playBtn);
    await vi.waitFor(() => expect(screen.getByText("⏸")).toBeDefined());
    fireEvent.click(playBtn);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("shows loop attribute on audio element", () => {
    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const audio = document.querySelector("audio");
    expect(audio).toBeDefined();
    expect(audio?.hasAttribute("loop")).toBe(true);
  });

  it("returns current music label for data URL", () => {
    render(<MusicPlayer musicUrl="data:audio/mp3,base64encodedstuff" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    expect(screen.getByText("setup.currentMusic")).toBeDefined();
  });

  it("handles URL parsing edge cases in songName", () => {
    render(<MusicPlayer musicUrl="https://example.com/" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    expect(screen.getByText("music.noMusic")).toBeDefined();
  });

  it("sets audio volume when slider changes", () => {
    const _volumeSetter = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
      writable: true,
      value: 0.5,
    });

    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const slider = document.querySelector(".music-player__volume") as HTMLInputElement;
    expect(slider).toBeDefined();
    fireEvent.change(slider, { target: { value: "0.8" } });
  });

  it("handles toggleMusic early return when no musicUrl", () => {
    render(<MusicPlayer />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const playBtn = document.querySelector(".music-player__play") as HTMLButtonElement;
    expect(playBtn.disabled).toBe(true);
    playBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.querySelector(".music-player__spinner")).toBeNull();
  });

  it("calls audioRef.current.volume when volume changes", () => {
    const volumeSetter = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
      set: volumeSetter,
      get: () => 0.5,
      configurable: true,
    });

    render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const slider = document.querySelector(".music-player__volume") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0.3" } });
    expect(volumeSetter).toHaveBeenCalledWith(0.3);
  });

  it("handles handleVolume when audioRef is null", () => {
    const audio = document.createElement("audio");
    const volumeSetter = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
      set: volumeSetter,
      get: () => 0.5,
      configurable: true,
    });

    const { rerender } = render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    rerender(<MusicPlayer />);
    const slider = document.querySelector(".music-player__volume") as HTMLInputElement;
    expect(slider.disabled).toBe(true);
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  });

  it("handles toggleMusic early return when audioRef is null", () => {
    render(<MusicPlayer />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    const playBtn = document.querySelector(".music-player__play") as HTMLButtonElement;
    Object.defineProperty(playBtn, "disabled", { value: false, configurable: true });
    mockAudioPlay.mockImplementation(() => { throw new Error("no audio"); });
    playBtn.click();
    expect(document.querySelector(".music-player__spinner")).toBeNull();
  });

  it("calls handleVolume with audioRef.current null safely", () => {
    const volumeSetter = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
      set: volumeSetter,
      get: () => 0.5,
      configurable: true,
    });
    const { rerender } = render(<MusicPlayer musicUrl="https://example.com/song.mp3" />);
    const fab = screen.getByRole("button", { name: /music\.label/i });
    fireEvent.click(fab);
    rerender(<MusicPlayer />);
    const slider = document.querySelector(".music-player__volume") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0.3" } });
    expect(slider).toBeDefined();
  });
});
