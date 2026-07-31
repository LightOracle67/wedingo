import { isValidGoogleMapsUrl, convertToEmbedUrl } from "../lib/geo-utils";

function canEmbed(url: string): boolean {
  return url.includes('output=embed') || /^https:\/\/(www\.)?google\.(com|[a-z]{2,3})\/maps\//.test(url);
}

export default function WeddingMap({ mapUrl, t }: {
  mapUrl?: string;
  t: (key: string) => string;
}) {
  const embedSrc = mapUrl && isValidGoogleMapsUrl(mapUrl) ? convertToEmbedUrl(mapUrl) : "";
  const showIframe = embedSrc && canEmbed(embedSrc);

  return (
    <div className="story-map-wrapper" style={{ position: "relative", minHeight: "200px" }}>
      {showIframe ? (
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
