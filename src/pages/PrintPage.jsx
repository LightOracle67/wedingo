import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { THEME_PREVIEW_COLORS } from "../lib/constants";
import { parseSectionOrder, formatDate } from "../lib/section-utils";
import { escHtml } from "../lib/utils";
import { useTranslation } from "react-i18next";

function Section({ eyebrow, title, children, accent }) {
  return (
    <section className="print-section">
      <div className="print-section__deco print-section__deco--left">
        <svg viewBox="0 0 200 600" xmlns="http://www.w3.org/2000/svg" style={{ width: 140, height: "auto" }} opacity="0.15">
          <path d="M100,30 Q140,60 130,100 Q120,80 100,70 Q80,60 60,80 Q40,100 30,130 Q20,100 40,70 Q60,40 100,30" fill={accent} />
          <path d="M40,130 Q60,90 90,80 Q110,75 130,90 Q120,110 100,120 Q80,130 50,120 Q50,140 40,130" fill={accent} opacity="0.7" />
          <path d="M50,120 Q40,160 50,200 Q70,180 90,190 Q100,175 80,165 Q65,155 50,170 Q45,150 50,120" fill={accent} opacity="0.5" />
          <path d="M50,200 Q30,240 40,280 Q60,260 80,270 Q90,255 70,245 Q55,235 50,220 Q55,210 50,200" fill={accent} opacity="0.7" />
          <path d="M40,280 Q20,320 30,360 Q50,340 70,350 Q80,335 60,325 Q45,315 40,300 Q45,290 40,280" fill={accent} opacity="0.5" />
          <path d="M30,360 Q10,400 20,440 Q40,420 60,430 Q70,415 50,405 Q35,395 30,380 Q35,370 30,360" fill={accent} opacity="0.6" />
          <path d="M70,45 Q82,28 100,25 Q112,30 102,42 Q92,48 70,45" fill={accent} opacity="0.8" />
        </svg>
      </div>
      <div className="print-section__deco print-section__deco--right">
        <svg viewBox="0 0 200 600" xmlns="http://www.w3.org/2000/svg" style={{ width: 140, height: "auto" }} opacity="0.15">
          <path d="M100,30 Q140,60 130,100 Q120,80 100,70 Q80,60 60,80 Q40,100 30,130 Q20,100 40,70 Q60,40 100,30" fill={accent} />
          <path d="M40,130 Q60,90 90,80 Q110,75 130,90 Q120,110 100,120 Q80,130 50,120 Q50,140 40,130" fill={accent} opacity="0.7" />
          <path d="M50,120 Q40,160 50,200 Q70,180 90,190 Q100,175 80,165 Q65,155 50,170 Q45,150 50,120" fill={accent} opacity="0.5" />
          <path d="M50,200 Q30,240 40,280 Q60,260 80,270 Q90,255 70,245 Q55,235 50,220 Q55,210 50,200" fill={accent} opacity="0.7" />
          <path d="M40,280 Q20,320 30,360 Q50,340 70,350 Q80,335 60,325 Q45,315 40,300 Q45,290 40,280" fill={accent} opacity="0.5" />
          <path d="M30,360 Q10,400 20,440 Q40,420 60,430 Q70,415 50,405 Q35,395 30,380 Q35,370 30,360" fill={accent} opacity="0.6" />
          <path d="M70,45 Q82,28 100,25 Q112,30 102,42 Q92,48 70,45" fill={accent} opacity="0.8" />
        </svg>
      </div>
      <div className="print-section__card">
        {eyebrow && <p className="print-eyebrow">{eyebrow}</p>}
        {title && <h2 className="print-title">{title}</h2>}
        <div className="print-divider" />
        <div className="print-content">{children}</div>
      </div>
    </section>
  );
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
    return parseSectionOrder(config.sectionOrder).filter(s => s !== "rsvp" && !hiddenSet.has(s) && s !== "gallery");
  }, [config.sectionOrder, hiddenSet]);

  const theme = THEME_PREVIEW_COLORS[config.theme] || THEME_PREVIEW_COLORS.golden;
  const accent = theme.accent;
  const bg = theme.bg;

  const formattedDate = formatDate(config.weddingDay, config.weddingMonth, config.weddingYear);
  const timeStr = config.weddingHour ? `${String(config.weddingHour).padStart(2, "0")}:${String(config.weddingMinute || "0").padStart(2, "0")}` : "";
  const place = config.weddingPlace || "";
  const lat = config.weddingLatitude ? Number(config.weddingLatitude) : 0;
  const lng = config.weddingLongitude ? Number(config.weddingLongitude) : 0;
  const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : "";

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
      await new Promise(r => setTimeout(r, 400));
      const cleanup = () => {
        try { window.close(); } catch {}
      };
      window.onafterprint = cleanup;
      window.onbeforeunload = null;
      window.print();
      setTimeout(() => setShowCloseHint(true), 2000);
    };
    doPrint();
  }, [loaded]);

  const handleCloseWindow = useCallback(() => { try { window.close(); } catch {} }, []);

  if (isConfigLoading || !loaded) {
    return <div style={{ padding: "3rem", textAlign: "center", fontFamily: "Georgia, serif", color: "#888" }}>{t("print.preparing")}</div>;
  }

  return (
    <div className="print-root" style={{ "--print-accent": accent, "--print-bg": bg }}>
      {sectionOrder.includes("hero") && (
        <Section accent={accent} bg={bg}>
          {config.couplePhoto ? <img src={config.couplePhoto} alt={t("print.couplePhoto")} className="print-hero-pic" /> : null}
          <h1 className="print-hero-couple">{escHtml(config.firstName)} & {escHtml(config.secondName)}</h1>
          <p className="print-hero-msg">{escHtml(config.inviteMessage)}</p>
          {config.godparent1 && config.godparent2 ? (
            <p className="print-godparents">{t("print.godparentsText")} {escHtml(config.godparent1)} y {escHtml(config.godparent2)}</p>
          ) : null}
        </Section>
      )}

      {sectionOrder.includes("details") && (
        <Section eyebrow={t("print.dateAndPlace")} title={formattedDate} accent={accent} bg={bg}>
          {timeStr ? <p className="print-body print-body--tight">{t("print.celebrationTime")}{timeStr}h</p> : null}
          {place ? <p className="print-body print-body--tight">{escHtml(place)}</p> : null}
          {mapsUrl ? <p className="print-body print-body--tight"><a href={mapsUrl} className="print-link">{t("print.viewInGoogleMaps")}</a></p> : null}
          <p className="print-body print-body--tight" style={{ marginTop: 12, fontStyle: "italic" }}>{t("print.celebrationMessage")}</p>
          {config.transportInfo ? (
            <div className="print-info-box">
              <p><strong>{t("print.transport")}</strong></p>
              <p className="print-body print-body--tight">{escHtml(config.transportInfo)}</p>
            </div>
          ) : null}
        </Section>
      )}

      {sectionOrder.includes("info") && (
        <Section eyebrow={t("print.aboutGuests")} title={t("print.scheduleTitle")} accent={accent} bg={bg}>
          {config.weddingSchedule ? (
            <div className="print-info-box">
              {config.weddingSchedule.split("\n").filter(Boolean).map((line, i) => {
                const m = line.match(/^(\d{1,2}:\d{2})\s*(.*)/);
                return m
                  ? <div key={i} className="print-schedule-line"><span className="print-schedule-time">{m[1]}</span><span>{m[2]}</span></div>
                  : <p key={i}>{line}</p>;
              })}
            </div>
          ) : <p className="print-body print-body--tight">{t("print.scheduleFallback")}</p>}
          <div className="print-divider" />
          <h3 className="print-subtitle">{t("print.dressCode")}</h3>
          {config.weddingDressCode ? (
            <div style={{ marginTop: 6 }}>
              {config.weddingDressCode.split(",").map((d, i) => <span key={i} className="print-dress">{escHtml(d.trim())}</span>)}
            </div>
          ) : <p className="print-body print-body--tight">{t("print.dressCodeFallback")}</p>}
          {config.kidsPolicy ? (
            <>
              <div className="print-divider" />
              <h3 className="print-subtitle">{t("print.aboutKids")}</h3>
              <p className="print-body print-body--tight">{escHtml(config.kidsPolicy === "playArea" || config.kidsPolicy === "supervised" || config.kidsPolicy === "adultOnly" ? t("kidsPolicy.options." + config.kidsPolicy) : config.kidsPolicy)}</p>
            </>
          ) : null}
        </Section>
      )}

      {sectionOrder.includes("story") && (
        <Section eyebrow={t("print.ourStory")} title={t("print.storyStarted")} accent={accent} bg={bg}>
          <p className="print-body">{escHtml(config.storyText || t("print.storyFallback"))}</p>
        </Section>
      )}

      {sectionOrder.includes("gifts") && (
        <Section eyebrow={t("print.gifts")} title={t("print.bestGift")} accent={accent} bg={bg}>
          <p className="print-body">{escHtml(config.giftsInfo || t("print.giftsFallback"))}</p>
          {config.bankInfo ? (
            <div className="print-info-box" style={{ marginTop: 12 }}>
              <p><strong>{t("print.bankDetails")}</strong></p>
              <p className="print-body print-body--tight">{escHtml(config.bankInfo)}</p>
            </div>
          ) : null}
        </Section>
      )}

      {sectionOrder.includes("accommodation") && (
        <Section eyebrow={t("print.accommodation")} title={t("print.whereToStay")} accent={accent} bg={bg}>
          <p className="print-body">{escHtml(config.accommodationInfo || t("print.accommodationFallback"))}</p>
        </Section>
      )}

      <p className="print-footer">{t("print.footer")}</p>
      {showCloseHint ? (
        <div style={{ textAlign: "center", padding: "0.5rem 1rem 1.5rem" }}>
          <button type="button" onClick={handleCloseWindow} style={{
            background: "var(--print-accent, #d8b24a)", color: "#fff", border: "none",
            borderRadius: "0.5rem", padding: "0.5rem 1.5rem", fontFamily: "inherit",
            fontSize: "0.9rem", cursor: "pointer",
          }}>{t("print.closeWindow")}</button>
        </div>
      ) : null}
    </div>
  );
}
