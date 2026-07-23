import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import MusicPlayer from "../MusicPlayer";

afterEach(cleanup);

describe("MusicPlayer", () => {
  it("renders the FAB button when no music URL is provided", () => {
    render(<MusicPlayer musicUrl={null} />);
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
});
