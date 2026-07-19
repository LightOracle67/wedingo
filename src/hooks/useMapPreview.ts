import { useEffect, useRef, useState } from "react";
import i18n from "../i18n";
import { getValidCoordinates, resolveLocationTarget } from "../lib/geo-utils";
import { buildOpenFreeMapPreviewUrl } from "../lib/map-utils";

export function useMapPreview(weddingPlace, weddingLatitude, weddingLongitude) {
  const [previewBackgrounds, setPreviewBackgrounds] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewRequestRef = useRef(0);

  useEffect(() => {
    const place = (weddingPlace || "").trim();
    const hasExactCoordinates = Boolean(getValidCoordinates(weddingLatitude, weddingLongitude));
    if (!place && !hasExactCoordinates) {
      setPreviewBackgrounds([]);
      setIsPreviewLoading(false);
      return undefined;
    }

    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setIsPreviewLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const resolvedLocation = await resolveLocationTarget({
          place,
          latitudeValue: weddingLatitude,
          longitudeValue: weddingLongitude,
        });
        if (!resolvedLocation) {
          if (previewRequestRef.current === requestId) setPreviewBackgrounds([]);
          return;
        }
        const src = await buildOpenFreeMapPreviewUrl(resolvedLocation, {
          id: "default",
          label: i18n.t("public.mapPreviewAlt"),
          description: i18n.t("public.mapPreviewAlt"),
        });
        if (previewRequestRef.current !== requestId) return;
        setPreviewBackgrounds(src ? [{ id: "default", src, label: i18n.t("public.mapPreviewAlt"), description: i18n.t("public.mapPreviewAlt") }] : []);
      } finally {
        if (previewRequestRef.current === requestId) setIsPreviewLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [weddingPlace, weddingLatitude, weddingLongitude]);

  return { previewBackgrounds, isPreviewLoading, setPreviewBackgrounds, setIsPreviewLoading };
}
