import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../contexts";
import { useTranslation } from "react-i18next";
import { randomMessage } from "../lib/invite-messages";
import "../styles/print.css";

export default function PrintPage() {
  const { t, i18n } = useTranslation();
  const { config, isConfigLoading } = useApp();
  console.log("[app]", "[PrintPage]", "mount", { isConfigLoading });
  const printed = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    console.log("[app]", "[PrintPage]", "set document title", { firstName: config.firstName, secondName: config.secondName });
    document.title = `${config.firstName} & ${config.secondName} — Wedingo`;
  }, [config.firstName, config.secondName]);

  const monthMap: Record<string, number> = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };
  const weddingDateObj = config.weddingDay && config.weddingMonth && config.weddingYear
    ? new Date(Number(config.weddingYear), monthMap[config.weddingMonth] || 0, Number(config.weddingDay))
    : null;
  const formattedDate = weddingDateObj ? weddingDateObj.toLocaleDateString(navigator.language || "es", { dateStyle: "long" }) : "";
  const timeStr = config.weddingHour
    ? `${String(config.weddingHour).padStart(2, "0")}:${String(config.weddingMinute || "0").padStart(2, "0")}`
    : "";
  const place = config.weddingPlace || "";

  const message = useMemo(() => {
    const raw = randomMessage(i18n.language);
    console.log("[app]", "[PrintPage]", "random message generated", { lang: i18n.language });
    return raw;
  }, [i18n.language]);

  useEffect(() => {
    if (isConfigLoading) {
      console.log("[app]", "[PrintPage]", "config still loading, skip load");
      return;
    }
    console.log("[app]", "[PrintPage]", "starting load timer");
    const id = setTimeout(() => {
      console.log("[app]", "[PrintPage]", "loaded");
      setLoaded(true);
    }, 200);
    return () => {
      console.log("[app]", "[PrintPage]", "load timer cleanup");
      clearTimeout(id);
    };
  }, [isConfigLoading]);

  useEffect(() => {
    if (!loaded || printed.current) {
      console.log("[app]", "[PrintPage]", "print skipped", { loaded, alreadyPrinted: printed.current });
      return;
    }
    printed.current = true;
    console.log("[app]", "[PrintPage]", "PDF generation start");
    const doPrint = async () => {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 400));
      const cleanup = () => {
        console.log("[app]", "[PrintPage]", "after print cleanup, closing window");
        try { window.close(); } catch (err) { console.error("[app]", "[PrintPage]", "window close error", err); }
      };
      window.onafterprint = cleanup;
      window.onbeforeunload = null;
      console.log("[app]", "[PrintPage]", "PDF generation success, triggering print");
      window.print();
    };
    doPrint().catch((err) => console.error("[app]", "[PrintPage]", "PDF generation error", err));
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
      <div className="print-page">
        <div className="print-card">
          <p className="print-eyebrow">{t("hero.eyebrow")}</p>
          <h1 className="print-couple-name">
            {config.firstName}
            <span className="print-couple-ampersand">&</span>
            {config.secondName}
          </h1>
          <div className="print-divider" />
          <p className="print-message">{message}</p>
          <div className="print-divider" />
          <p className="print-body">{formattedDate}</p>
          {timeStr ? <p className="print-body" style={{ marginTop: "0.15rem" }}>{timeStr}{t("print.timeSuffix")}</p> : null}
          {place ? <p className="print-body" style={{ marginTop: "0.15rem" }}>{place}</p> : null}
        </div>
      </div>
    </div>
  );
}
