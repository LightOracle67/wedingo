import { isValidGoogleMapsUrl, convertToEmbedUrl } from "../lib/geo-utils";

export default function WeddingMap({ mapUrl, t }: {
  mapUrl?: string;
  t: (key: string) => string;
}) {
  const embedSrc = mapUrl && isValidGoogleMapsUrl(mapUrl) ? convertToEmbedUrl(mapUrl) : "";

  return (
    <div className="story-map-wrapper" style={{ position: "relative", minHeight: "200px" }}>
      {embedSrc ? (
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
