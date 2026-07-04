const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const buildOpenFreeMapPreviewUrl = async (location, _style) => {
  if (!location) return "";

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "-10000px";
  container.style.width = "1200px";
  container.style.height = "800px";
  document.body.appendChild(container);

  try {
    const maplibregl = (await import("maplibre-gl")).default;
    const map = new maplibregl.Map({
      container,
      style: OPEN_FREE_MAP_STYLE,
      center: [location.longitude, location.latitude],
      zoom: 15,
      bearing: -12,
      pitch: 40,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });

    const markerElement = document.createElement("div");
    markerElement.style.width = "18px";
    markerElement.style.height = "18px";
    markerElement.style.borderRadius = "999px";
    markerElement.style.background = "#d8b24a";
    markerElement.style.border = "3px solid rgba(255, 255, 255, 0.95)";
    markerElement.style.boxShadow = "0 0 0 8px rgba(216, 178, 74, 0.18)";

    new maplibregl.Marker({ element: markerElement, anchor: "center" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);

    await new Promise((resolve, reject) => {
      map.once("error", reject);
      map.once("idle", resolve);
    });

    const previewUrl = map.getCanvas().toDataURL("image/png");
    map.remove();
    return previewUrl;
  } finally {
    container.remove();
  }
};
