import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { parseSectionOrder } from "../lib/section-utils";
import HeroSection from "./sections/HeroSection";
import DetailsSection from "./sections/DetailsSection";
import InfoSection from "./sections/InfoSection";
import StorySection from "./sections/StorySection";
import GiftsSection from "./sections/GiftsSection";
import AccommodationSection from "./sections/AccommodationSection";
import GallerySection from "./sections/GallerySection";

export default function PrintPage() {
  const { inviteToken } = useParams();
  const {
    config, isConfigLoading, formattedDate, formattedTime, calendarLink,
    locationMapContainerRef, locationMapLoading, locationMapError, locationMapTarget,
    rsvpForm, updateRsvpField,
  } = useApp();
  const printed = useRef(false);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  const hiddenSet = useMemo(() => {
    const raw = config.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [config.hiddenSections]);

  const sectionOrder = useMemo(() => {
    return parseSectionOrder(config.sectionOrder).filter(s => s !== "rsvp" && !hiddenSet.has(s));
  }, [config.sectionOrder, hiddenSet]);

  useEffect(() => {
    if (isConfigLoading || printed.current) return;
    printed.current = true;
    const print = async () => {
      await document.fonts.ready;
      await new Promise(r => { if (document.readyState === "complete") r(); else window.addEventListener("load", r, { once: true }); });
      await new Promise(r => setTimeout(r, 500));
      window.onafterprint = () => window.close();
      window.print();
    };
    print();
  }, [isConfigLoading, galleryLoaded]);

  const configuredCoordinates = config.weddingLatitude && config.weddingLongitude
    ? { latitude: Number(config.weddingLatitude), longitude: Number(config.weddingLongitude) }
    : null;
  const hasLocationData = Boolean(config.weddingPlace || configuredCoordinates);
  const locationDescription = config.weddingPlace || (configuredCoordinates
    ? `Coordenadas: ${configuredCoordinates.latitude}, ${configuredCoordinates.longitude}`
    : "");

  const sectionProps = {
    hero: {
      firstName: config.firstName, secondName: config.secondName,
      inviteMessage: config.inviteMessage, couplePhoto: config.couplePhoto,
      musicUrl: config.musicUrl, godparent1: config.godparent1, godparent2: config.godparent2,
    },
    details: {
      formattedDate, formattedTime, hasLocationData, locationDescription, calendarLink,
      locationMapContainerRef, locationMapLoading, locationMapError, locationMapTarget,
      configWeddingPlace: config.weddingPlace, transportInfo: config.transportInfo,
    },
    info: {
      weddingSchedule: config.weddingSchedule, weddingDressCode: config.weddingDressCode,
      kidsPolicy: config.kidsPolicy,
    },
    story: { storyText: config.storyText },
    gifts: { giftsInfo: config.giftsInfo, bankInfo: config.bankInfo },
    accommodation: { accommodationInfo: config.accommodationInfo },
    gallery: { inviteToken },
  };

  const countdownRef = useRef(null);

  if (isConfigLoading) {
    return <div style={{ padding: "2rem", textAlign: "center", fontFamily: "serif", color: "#888" }}>Cargando...</div>;
  }

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#222" }}>
      {sectionOrder.map((key, i) => {
        const Section = {
          hero: HeroSection, details: DetailsSection, info: InfoSection,
          story: StorySection, gifts: GiftsSection, accommodation: AccommodationSection,
          gallery: GallerySection,
        }[key];
        if (!Section) return null;
        return (
          <div key={key} style={{
            pageBreakAfter: i < sectionOrder.length - 1 ? "always" : "auto",
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem", boxSizing: "border-box",
          }}>
            <Section
              style={{ opacity: 1, transform: "none", filter: "none" }}
              className="story-section story-section--is-active"
              {...(sectionProps[key] || {})}
            />
          </div>
        );
      })}
    </div>
  );
}
