import { memo } from "react";

const LoadingOverlay = memo(function LoadingOverlay({ visible, zIndex }: { visible?: boolean; zIndex?: number }) {
  if (!visible) return null;
  return (
    <div className="page-loading" style={{
      position: "absolute", inset: 0, zIndex: zIndex ?? 1,
    }} />
  );
});

export default LoadingOverlay;
