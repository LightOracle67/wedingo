/// <reference types="vite/client" />

declare module "leaflet" {
  interface Map {
    remove: () => void;
    whenReady: (fn: () => void) => void;
    invalidateSize: () => void;
  }
  const L: {
    map: (container: HTMLElement, options?: Record<string, unknown>) => Map;
    tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: Map) => void };
    circleMarker: (latlng: [number, number], options?: Record<string, unknown>) => { addTo: (map: Map) => void };
  };
  export default L;
}
