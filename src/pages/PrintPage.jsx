import { useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { getValidCoordinates } from "../lib/utils";
import { MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import { parseSectionOrder } from "../lib/section-utils";

export default function PrintPage() {
  const { inviteToken } = useParams();
  const { config, isConfigLoading, formattedDate, formattedTime } = useApp();
  const printed = useRef(false);

  const hiddenSet = useMemo(() => {
    const raw = config.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [config.hiddenSections]);

  const sectionOrder = useMemo(() => {
    return parseSectionOrder(config.sectionOrder).filter(s => s !== "rsvp" && !hiddenSet.has(s));
  }, [config.sectionOrder, hiddenSet]);

  const coupleName = `${config.firstName} & ${config.secondName}`;

  useEffect(() => {
    if (isConfigLoading || printed.current) return;
    printed.current = true;
    const print = async () => {
      await document.fonts.ready;
      await new Promise(r => { if (document.readyState === "complete") r(); else window.addEventListener("load", r, { once: true }); });
      await new Promise(r => setTimeout(r, 300));
      window.onafterprint = () => window.close();
      window.print();
    };
    print();
  }, [isConfigLoading]);

  if (isConfigLoading) {
    return <div style={{ padding: "2rem", textAlign: "center", fontFamily: "serif", color: "#888" }}>Cargando...</div>;
  }

  const sections = {
    hero: (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0, fontFamily: "serif" }}>{coupleName}</h1>
        {config.inviteMessage ? <p style={{ marginTop: "0.75rem", fontSize: "1rem" }}>{config.inviteMessage}</p> : null}
      </div>
    ),
    details: (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: "1.3rem", fontFamily: "serif", margin: 0 }}>{formattedDate || "Fecha por definir"}</h2>
        {formattedTime ? <p style={{ fontSize: "1rem" }}>{formattedTime}</p> : null}
        {config.weddingPlace ? <p style={{ fontSize: "1rem" }}>{config.weddingPlace}</p> : null}
      </div>
    ),
    info: (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        {config.weddingSchedule ? <p style={{ whiteSpace: "pre-line", fontSize: "0.95rem" }}>{config.weddingSchedule}</p> : null}
        {config.weddingDressCode ? <p style={{ marginTop: "0.5rem", fontSize: "0.95rem" }}>Código de vestimenta: {config.weddingDressCode}</p> : null}
        {config.kidsPolicy ? <p style={{ marginTop: "0.5rem", fontSize: "0.95rem" }}>{config.kidsPolicy}</p> : null}
      </div>
    ),
    story: (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        <p style={{ whiteSpace: "pre-line", fontSize: "0.95rem" }}>{config.storyText}</p>
      </div>
    ),
    gifts: (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        {config.giftsInfo ? <p style={{ whiteSpace: "pre-line", fontSize: "0.95rem" }}>{config.giftsInfo}</p> : null}
        {config.bankInfo ? <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", fontFamily: "monospace" }}>{config.bankInfo}</p> : null}
      </div>
    ),
    accommodation: (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        {config.accommodationInfo ? <p style={{ whiteSpace: "pre-line", fontSize: "0.95rem" }}>{config.accommodationInfo}</p> : null}
      </div>
    ),
    gallery: null,
    menu: null,
  };

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#222" }}>
      {sectionOrder.map((key, i) => (
        <div key={key} style={{ pageBreakAfter: i < sectionOrder.length - 1 ? "always" : "auto", minHeight: "90vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {sections[key] || null}
        </div>
      ))}
    </div>
  );
}
