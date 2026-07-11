import { useEffect, useRef, useState } from "react";
import { getValidCoordinates, resolveLocationTarget } from "../lib/geo-utils";

export default function WeddingMap({ weddingPlace, weddingLatitude, weddingLongitude, t }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const place = (weddingPlace || "").trim();
    const container = containerRef.current;
    const hasExactCoordinates = Boolean(getValidCoordinates(weddingLatitude, weddingLongitude));
    if ((!place && !hasExactCoordinates) || !container) {
      setLoading(false);
      setError("");
      return;
    }

    let isCancelled = false;
    let mapInstance = null;
    setError("");
    setLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        await import("leaflet/dist/leaflet.css");
        const L = (await import("leaflet")).default;
        const geocodedLocation = await resolveLocationTarget({
          place,
          latitudeValue: weddingLatitude,
          longitudeValue: weddingLongitude,
        });
        if (isCancelled || !container.isConnected) return;

        if (!geocodedLocation) {
          setError(t?.("public.locationNotFound") || "Ubicación no encontrada");
          setLoading(false);
          return;
        }

        mapInstance = L.map(container, {
          center: [geocodedLocation.latitude, geocodedLocation.longitude],
          zoom: 15,
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: false,
          dragging: false,
        });

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapInstance);

        L.circleMarker([geocodedLocation.latitude, geocodedLocation.longitude], {
          radius: 10,
          color: "#d8b24a",
          fillColor: "#d8b24a",
          fillOpacity: 0.9,
          weight: 3,
          opacity: 0.8,
        }).addTo(mapInstance);

        mapInstance.whenReady(() => {
          mapInstance.invalidateSize();
          if (!isCancelled) setLoading(false);
        });
      } catch {
        if (!isCancelled) {
          setError(t?.("public.locationMapError") || "Error al cargar el mapa");
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      if (mapInstance) mapInstance.remove();
    };
  }, [weddingPlace, weddingLatitude, weddingLongitude, t]);

  return (
    <div className="story-map-wrapper" style={{ position: "relative", minHeight: "200px" }}>
      <div ref={containerRef} className="story-map" style={{ width: "100%", height: "250px", borderRadius: "12px" }} />
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.05)" }}>
          <div className="page-loading" />
        </div>
      )}
      {error && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.05)", color: "var(--color-error, #ef4444)", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}
