import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { parseSectionOrder, formatDate } from "../lib/section-utils";
import { useTranslation } from "react-i18next";
import HeroSection from "./sections/HeroSection";
import DetailsSection from "./sections/DetailsSection";
import InfoSection from "./sections/InfoSection";
import StorySection from "./sections/StorySection";
import GiftsSection from "./sections/GiftsSection";
import AccommodationSection from "./sections/AccommodationSection";
import "../styles/print.css";

function useCountdown(weddingDate: Date | null) {
  return useMemo(() => {
    if (!weddingDate) return null;
    const now = new Date();
    const diff = weddingDate.getTime() - now.getTime();
    if (diff <= 0) return { expired: true, years: 0, months: 0, days: 0, hours: 0, minutes: 0 };
    const totalSec = Math.floor(diff / 1000);
    const years = Math.floor(totalSec / (86400 * 365));
    const months = Math.floor(totalSec / (86400 * 30.44));
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    return { expired: false, years, months, days, hours, minutes };
  }, [weddingDate]);
}

export default function PrintPage() {
  const { t } = useTranslation();
  const { config, isConfigLoading } = useApp();
  const printed = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [showCloseHint, setShowCloseHint] = useState(false);

  const hiddenSet = useMemo(() => {
    const raw = config.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [config.hiddenSections]);

  const sectionOrder = useMemo(() => {
    return parseSectionOrder(config.sectionOrder).filter(
      (s: any) => s !== "rsvp" && !hiddenSet.has(s) && s !== "gallery",
    );
  }, [config.sectionOrder, hiddenSet]);

  const formattedDate = formatDate(config.weddingDay, config.weddingMonth, config.weddingYear);
  const formattedTime = config.weddingHour
    ? `${String(config.weddingHour).padStart(2, "0")}:${String(config.weddingMinute || "0").padStart(2, "0")}`
    : "";

  const weddingDate = useMemo(() => {
    if (!config.weddingDay || !config.weddingMonth || !config.weddingYear) return null;
    const monthMap: any = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };
    const m = monthMap[config.weddingMonth];
    if (m === undefined) return null;
    return new Date(Number(config.weddingYear), m, Number(config.weddingDay), Number(config.weddingHour || 0), Number(config.weddingMinute || 0));
  }, [config.weddingDay, config.weddingMonth, config.weddingYear, config.weddingHour, config.weddingMinute]);

  const countdown = useCountdown(weddingDate);

  const lat = Number(config.weddingLatitude) || 0;
  const lng = Number(config.weddingLongitude) || 0;
  const hasLocationData = Boolean(lat && lng);
  const locationMapTarget = hasLocationData ? { latitude: lat, longitude: lng, label: config.weddingPlace || "" } : null;
  const calendarLink = weddingDate
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(config.firstName + " & " + config.secondName)}&dates=${weddingDate.toISOString().replace(/[-:]/g, "").split(".")[0]}/${weddingDate.toISOString().replace(/[-:]/g, "").split(".")[0]}&details=${encodeURIComponent(config.inviteMessage || "")}&location=${encodeURIComponent(config.weddingPlace || "")}`
    : "";
  const locationDescription = config.weddingPlace || "";

  const sectionProps = useMemo(() => ({
    hero: {
      firstName: config.firstName,
      secondName: config.secondName,
      inviteMessage: config.inviteMessage,
      countdown,
      couplePhoto: config.couplePhoto,
      godparent1: config.godparent1,
      godparent2: config.godparent2,
    },
    details: {
      formattedDate,
      formattedTime,
      hasLocationData,
      locationDescription,
      calendarLink,
      locationMapTarget,
      configWeddingPlace: config.weddingPlace,
      transportInfo: config.transportInfo,
    },
    info: {
      weddingSchedule: config.weddingSchedule,
      weddingDressCode: config.weddingDressCode,
      kidsPolicy: config.kidsPolicy,
    },
    story: { storyText: config.storyText },
    gifts: { giftsInfo: config.giftsInfo, bankInfo: config.bankInfo },
    accommodation: { accommodationInfo: config.accommodationInfo },
  }), [
    config.firstName, config.secondName, config.inviteMessage, config.couplePhoto,
    config.godparent1, config.godparent2, config.weddingPlace, config.transportInfo,
    config.weddingSchedule, config.weddingDressCode, config.kidsPolicy, config.storyText,
    config.giftsInfo, config.bankInfo, config.accommodationInfo,
    countdown, formattedDate, formattedTime,
    hasLocationData, calendarLink, locationDescription,
  ]);

  useEffect(() => {
    if (isConfigLoading) return;
    const id = setTimeout(() => setLoaded(true), 200);
    return () => clearTimeout(id);
  }, [isConfigLoading]);

  useEffect(() => {
    if (!loaded || printed.current) return;
    printed.current = true;
    const doPrint = async () => {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 400));
      const cleanup = () => { try { window.close(); } catch {} };
      window.onafterprint = cleanup;
      window.onbeforeunload = null;
      window.print();
      setTimeout(() => setShowCloseHint(true), 2000);
    };
    doPrint();
  }, [loaded]);

  if (isConfigLoading || !loaded) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: "Georgia, serif", color: "#888" }}>
        {t("print.preparing")}
      </div>
    );
  }

  return (
    <div className="print-root">
      {sectionOrder.map((section: string) => {
        switch (section) {
          case "hero":
            return (
              <section key="hero" className="print-section story-section story-section--is-active" data-story-section="hero">
                <HeroSection
                  className=""
                  style={{}}
                  {...sectionProps.hero}
                />
              </section>
            );
          case "details":
            return (
              <section key="details" className="print-section story-section story-section--is-active" data-story-section="details">
                <DetailsSection
                  className=""
                  style={{}}
                  {...sectionProps.details}
                />
              </section>
            );
          case "info":
            return (
              <section key="info" className="print-section story-section story-section--is-active" data-story-section="info">
                <InfoSection
                  className=""
                  style={{}}
                  {...sectionProps.info}
                />
              </section>
            );
          case "story":
            return (
              <section key="story" className="print-section story-section story-section--is-active" data-story-section="story">
                <StorySection
                  className=""
                  style={{}}
                  {...sectionProps.story}
                />
              </section>
            );
          case "gifts":
            return (
              <section key="gifts" className="print-section story-section story-section--is-active" data-story-section="gifts">
                <GiftsSection
                  className=""
                  style={{}}
                  {...sectionProps.gifts}
                />
              </section>
            );
          case "accommodation":
            return (
              <section key="accommodation" className="print-section story-section story-section--is-active" data-story-section="accommodation">
                <AccommodationSection
                  className=""
                  style={{}}
                  {...sectionProps.accommodation}
                />
              </section>
            );
          default:
            return null;
        }
      })}
      {showCloseHint ? (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <button
            type="button"
            onClick={() => { try { window.close(); } catch {} }}
            style={{
              background: "var(--setup-accent, #d8b24a)", color: "#fff", border: "none",
              borderRadius: "0.5rem", padding: "0.5rem 1.5rem", fontFamily: "inherit",
              fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            {t("print.closeWindow")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
