import { useEffect, useMemo, useState } from "react";
import { getValidCoordinates, resolveLocationTarget, buildGoogleMapsEmbedUrl, buildGoogleMapsEmbedSearchUrl } from "../lib/geo-utils";

export default function WeddingMap({ weddingPlace, weddingLatitude, weddingLongitude, t }: {
  weddingPlace?: string;
  weddingLatitude?: string;
  weddingLongitude?: string;
  t: (key: string) => string;
}) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const place = (weddingPlace || "").trim();
    const hasExact = Boolean(getValidCoordinates(weddingLatitude ?? "", weddingLongitude ?? ""));
    if (!place && !hasExact) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError("");

    resolveLocationTarget({ place, latitudeValue: weddingLatitude ?? "", longitudeValue: weddingLongitude ?? "" })
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setLocation(result);
        } else {
          setError(t?.("public.locationNotFound") || "");
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setError(t?.("public.locationMapError") || ""); setLoading(false); } });

    return () => { cancelled = true; };
  }, [weddingPlace, weddingLatitude, weddingLongitude, t]);

  const embedSrc = useMemo(() => {
    if (!location) return "";
    if (location.label && (weddingPlace || "").trim()) {
      return buildGoogleMapsEmbedSearchUrl(weddingPlace || location.label);
    }
    return buildGoogleMapsEmbedUrl(location);
  }, [location, weddingPlace]);

  return (
    <div className="story-map-wrapper" style={{ position: "relative", minHeight: "200px" }}>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "250px" }}>
          <div className="page-loading" />
        </div>
      ) : error ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "250px", color: "var(--color-error, #ef4444)", fontSize: "0.9rem" }}>
          {error}
        </div>
      ) : embedSrc ? (
        <iframe
          title="Mapa de la ubicación"
          src={embedSrc}
          width="100%"
          height="250"
          style={{ border: 0, borderRadius: "12px" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : null}
    </div>
  );
}
