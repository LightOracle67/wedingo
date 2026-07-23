import { memo } from "react";

interface EqualizerBarsProps {
  isPlaying: boolean;
}

const EqualizerBars = memo(function EqualizerBars({ isPlaying }: EqualizerBarsProps) {
  return (
    <span className={`music-player__fab-equalizer${isPlaying ? " music-player__fab-equalizer--visible" : ""}`}>
      <span /><span /><span />
    </span>
  );
});

export default EqualizerBars;
