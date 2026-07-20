import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { THEME_PREVIEW_COLORS } from "../lib/constants";
import { parseSectionOrder, formatDate } from "../lib/section-utils";
import { escHtml } from "../lib/utils";
import { useTranslation } from "react-i18next";
import "../styles/print.css";

function scheduleLines(text: string) {
  return text.split("\n").filter(Boolean).map((line) => {
    const m = line.match(/^(\d{1,2}:\d{2})\s*(.*)/);
    return m ? { time: m[1], label: m[2] } : { time: "", label: line };
  });
}

function parseDressCode(text: string) {
  return text.split(",").map((s) => s.trim()).filter(Boolean);
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

  const theme = (THEME_PREVIEW_COLORS as any)[config.theme] || THEME_PREVIEW_COLORS.golden;
  const accent = theme.accent;
  const bg = theme.bg;

  const formattedDate = formatDate(config.weddingDay, config.weddingMonth, config.weddingYear);
  const timeStr = config.weddingHour
    ? `${String(config.weddingHour).padStart(2, "0")}:${String(config.weddingMinute || "0").padStart(2, "0")}`
    : "";
  const place = config.weddingPlace || "";
  const lat = config.weddingLatitude ? Number(config.weddingLatitude) : 0;
  const lng = config.weddingLongitude ? Number(config.weddingLongitude) : 0;
  const mapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : place
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
      : "";
  const dressItems = config.weddingDressCode ? parseDressCode(config.weddingDressCode) : [];
  const schedule = config.weddingSchedule ? scheduleLines(config.weddingSchedule) : [];
  const kidsLabel = config.kidsPolicy && ["playArea", "supervised", "adultOnly"].includes(config.kidsPolicy)
    ? t(`kidsPolicy.options.${config.kidsPolicy}`)
    : config.kidsPolicy || "";

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

  const handleCloseWindow = useCallback(() => { try { window.close(); } catch {} }, []);

  if (isConfigLoading || !loaded) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: "Georgia, serif", color: "#888" }}>
        {t("print.preparing")}
      </div>
    );
  }

  return (
    <div className="print-root" style={{ "--print-accent": accent, "--print-bg": bg } as any}>
      {sectionOrder.includes("hero") && (
        <section className="print-page">
          <div className="print-card">
            <p className="print-eyebrow">{t("hero.eyebrow")}</p>
            {config.couplePhoto ? (
              <img src={config.couplePhoto} alt="" className="print-photo" />
            ) : null}
            <h1 className="print-couple-name">
              {escHtml(config.firstName)}
              <span className="print-couple-ampersand">&</span>
              {escHtml(config.secondName)}
            </h1>
            {config.inviteMessage ? (
              <p className="print-message">{escHtml(config.inviteMessage)}</p>
            ) : null}
            {config.godparent1 && config.godparent2 ? (
              <p className="print-godparents">
                {t("hero.withBlessing", { godparent1: config.godparent1, godparent2: config.godparent2 })}
              </p>
            ) : null}
            <div className="print-divider" />
            <p className="print-body">{formattedDate}</p>
            {timeStr ? <p className="print-body print-body--small" style={{ marginTop: "0.25rem" }}>{timeStr}h</p> : null}
            {place ? <p className="print-body" style={{ marginTop: "0.5rem" }}>{escHtml(place)}</p> : null}
            {mapsUrl ? (
              <a href={mapsUrl} className="print-map-link" target="_blank" rel="noreferrer">
                {t("print.viewInGoogleMaps")}
              </a>
            ) : null}
          </div>
        </section>
      )}

      {sectionOrder.includes("details") && (
        <section className="print-page">
          <div className="print-card">
            <p className="print-eyebrow">{t("print.dateAndPlace")}</p>
            <h2 className="print-title">{formattedDate}</h2>

            <div className="print-divider" />

            <div className="print-detail-row">
              <span className="print-detail-icon">📅</span>
              <div>
                <p className="print-detail-label">{t("print.celebrationDate")}</p>
                <p className="print-detail-text">{formattedDate}</p>
              </div>
            </div>

            {timeStr ? (
              <div className="print-detail-row">
                <span className="print-detail-icon">⏰</span>
                <div>
                  <p className="print-detail-label">{t("print.celebrationTime")}</p>
                  <p className="print-detail-text">{timeStr}h</p>
                </div>
              </div>
            ) : null}

            {place ? (
              <div className="print-detail-row">
                <span className="print-detail-icon">📍</span>
                <div>
                  <p className="print-detail-label">{t("admin.place")}</p>
                  <p className="print-detail-text">{escHtml(place)}</p>
                  {mapsUrl ? (
                    <a href={mapsUrl} className="print-map-link" target="_blank" rel="noreferrer">
                      {t("print.viewInGoogleMaps")}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {config.transportInfo ? (
              <div className="print-box">
                <strong>{t("print.transport")}</strong>
                <p>{escHtml(config.transportInfo)}</p>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {sectionOrder.includes("info") && (
        <section className="print-page">
          <div className="print-card">
            <p className="print-eyebrow">{t("print.scheduleTitle")}</p>
            <h2 className="print-title">{t("print.aboutGuests")}</h2>

            <div className="print-divider" />

            {schedule.length > 0 ? (
              <div style={{ marginTop: "0.5rem" }}>
                {schedule.map((item, i) => (
                  <div key={i} className="print-schedule-item">
                    {item.time ? (
                      <span className="print-schedule-time">{item.time}</span>
                    ) : null}
                    <span className="print-schedule-label">{item.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="print-body">{t("print.scheduleFallback")}</p>
            )}

            {dressItems.length > 0 && (
              <>
                <div className="print-divider" />
                <p className="print-subtitle">{t("print.dressCode")}</p>
                <div style={{ marginTop: "0.3rem" }}>
                  {dressItems.map((d, i) => (
                    <span key={i} className="print-tag">{escHtml(d)}</span>
                  ))}
                </div>
              </>
            )}

            {kidsLabel ? (
              <>
                <div className="print-divider" />
                <p className="print-subtitle">{t("print.aboutKids")}</p>
                <p className="print-body print-body--small" style={{ marginTop: "0.3rem" }}>
                  {escHtml(kidsLabel)}
                </p>
              </>
            ) : null}
          </div>
        </section>
      )}

      {sectionOrder.includes("story") && config.storyText ? (
        <section className="print-page">
          <div className="print-card">
            <p className="print-eyebrow">{t("print.ourStory")}</p>
            <h2 className="print-title">{t("print.storyStarted")}</h2>
            <div className="print-divider" />
            <p className="print-story-text">{escHtml(config.storyText)}</p>
          </div>
        </section>
      ) : null}

      {sectionOrder.includes("gifts") && (
        <section className="print-page">
          <div className="print-card">
            <p className="print-eyebrow">{t("print.gifts")}</p>
            <h2 className="print-title">{t("print.bestGift")}</h2>
            <div className="print-divider" />
            <p className="print-body">{escHtml(config.giftsInfo || t("print.giftsFallback"))}</p>
            {config.bankInfo ? (
              <div className="print-box">
                <strong>{t("print.bankDetails")}</strong>
                <p className="print-bank-details">{escHtml(config.bankInfo)}</p>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {sectionOrder.includes("accommodation") && (
        <section className="print-page">
          <div className="print-card">
            <p className="print-eyebrow">{t("print.accommodation")}</p>
            <h2 className="print-title">{t("print.whereToStay")}</h2>
            <div className="print-divider" />
            <p className="print-body">{escHtml(config.accommodationInfo || t("print.accommodationFallback"))}</p>
          </div>
        </section>
      )}

      <p className="print-footer-note">{t("print.footer")}</p>

      {showCloseHint ? (
        <div style={{ textAlign: "center", padding: "0.5rem 1rem 1.5rem" }}>
          <button
            type="button"
            onClick={handleCloseWindow}
            style={{
              background: accent,
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 1.5rem",
              fontFamily: "inherit",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            {t("print.closeWindow")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
