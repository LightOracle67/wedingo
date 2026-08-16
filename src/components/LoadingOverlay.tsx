import { memo } from "react";

const LoadingOverlay = memo(function LoadingOverlay({ visible, zIndex }: { visible?: boolean; zIndex?: number }) {
  if (!visible) return null;
  return (
    <div
      className="page-loading loading-overlay"
      role="status"
      aria-label="loading"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: zIndex ?? 1,
        // .page-loading impone min-height:80vh: en contenedores pequeños
        // (foto del hero, galería) el overlay se desbordaba. Se anula aquí.
        minHeight: 0,
        height: "100%",
      }}
    />
  );
});

export default LoadingOverlay;
