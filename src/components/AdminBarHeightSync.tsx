import { useEffect } from "react";

export default function AdminBarHeightSync({ show }: { show: boolean }) {
  useEffect(() => {
    if (!show) return;
    const bar = document.querySelector<HTMLElement>(".admin-bar");
    if (!bar) return;
    const sync = () => {
      const height = Math.ceil(bar.getBoundingClientRect().height);
      if (Number.isFinite(height) && height > 0) {
        document.documentElement.style.setProperty("--navbar-height", `${height}px`);
      }
    };
    sync();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(sync);
      ro.observe(bar);
    }
    window.addEventListener("resize", sync);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", sync);
      document.documentElement.style.removeProperty("--navbar-height");
    };
  }, [show]);
  return null;
}
