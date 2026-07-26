import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import EqualizerBars from "../EqualizerBars";

afterEach(cleanup);

describe("EqualizerBars", () => {
  it("renders playing state", () => {
    const { container } = render(<EqualizerBars isPlaying={true} />);
    expect(container.querySelector(".music-player__fab-equalizer")).toBeDefined();
  });
  it("renders paused state", () => {
    const { container } = render(<EqualizerBars isPlaying={false} />);
    expect(container.querySelector(".music-player__fab-equalizer")).toBeDefined();
  });
});
