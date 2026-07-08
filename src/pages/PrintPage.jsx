import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { THEME_PREVIEW_COLORS } from "../lib/constants";
import { parseSectionOrder, formatDate } from "../lib/section-utils";

function Section({ eyebrow, title, children, accent, bg }) {
  return (
    <section className="print-section">
      <div className="print-section__bg" />
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

function S({ children, ...rest }) {
  return <span {...rest}>{String(children || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</span>;
}

const MONTHS = {
  enero: "enero", febrero: "febrero", marzo: "marzo", abril: "abril", mayo: "mayo", junio: "junio",
  julio: "julio", agosto: "agosto", septiembre: "septiembre", octubre: "octubre", noviembre: "noviembre", diciembre: "diciembre",
};

export default function PrintPage() {
  const { inviteToken } = useParams();
  const { config, isConfigLoading } = useApp();
  const printed = useRef(false);
  const [loaded, setLoaded] = useState(false);

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
  const timeStr = config.weddingHour ? `${config.weddingHour}:${String(config.weddingMinute || "0").padStart(2, "0")}` : "";
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
      window.onafterprint = () => { try { window.close(); } catch {} };
      window.print();
    };
    doPrint();
  }, [loaded]);

  if (isConfigLoading || !loaded) {
    return <div style={{ padding: "3rem", textAlign: "center", fontFamily: "Georgia, serif", color: "#888" }}>Preparando impresión...</div>;
  }

  return (
    <div className="print-root" style={{ "--print-accent": accent, "--print-bg": bg }}>
      <style>{`
        @page { margin: 0; size: A4; }
        .print-root { font-family: Lora, Georgia, serif; color: #ccc; background: var(--print-bg); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-section { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2.5rem 2rem; overflow: hidden; page-break-after: always; }
        .print-section:last-of-type { page-break-after: auto; }
        .print-section__bg { position: absolute; inset: 0; background: linear-gradient(150deg, rgba(0,0,0,0.3), rgba(0,0,0,0.1) 50%, transparent); }
        .print-section__deco { position: absolute; top: 50%; z-index: 0; }
        .print-section__deco--left { left: 0; transform: translateY(-50%) scaleX(-1); }
        .print-section__deco--right { right: 0; transform: translateY(-50%); }
        .print-section__card { position: relative; z-index: 1; background: rgba(255,255,255,0.06); border: 1px solid var(--print-accent); border-color: color-mix(in srgb, var(--print-accent) 30%, transparent); border-radius: 1.4rem; padding: 2.5rem 2rem; max-width: 500px; width: 100%; text-align: center; }
        .print-section__card::after { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--print-accent) 60%, transparent), transparent); border-radius: 2px; }
        .print-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: var(--print-accent); margin-bottom: 10px; }
        .print-title { font-family: "Playfair Display", Georgia, serif; font-size: 28px; color: #eee; margin-bottom: 6px; line-height: 1.2; }
        .print-subtitle { font-family: "Playfair Display", Georgia, serif; font-size: 18px; color: #ddd; margin: 14px 0 6px; }
        .print-body { font-size: 15px; color: #bbb; max-width: 400px; margin: 0 auto; white-space: pre-line; }
        .print-body--tight { font-size: 14px; color: #aaa; }
        .print-hero-couple { font-size: 46px; font-family: "Playfair Display", Georgia, serif; font-weight: 700; color: #f0e6d0; margin-bottom: 8px; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .print-hero-msg { font-size: 16px; color: #c8b898; max-width: 400px; margin: 0 auto 14px; font-style: italic; }
        .print-hero-pic { max-width: 180px; max-height: 180px; border-radius: 50%; object-fit: cover; margin: 0 auto 22px; border: 2px solid color-mix(in srgb, var(--print-accent) 40%, transparent); }
        .print-godparents { font-size: 14px; color: #999; font-style: italic; }
        .print-divider { width: 60px; height: 1px; background: var(--print-accent); opacity: 0.5; margin: 14px auto; }
        .print-info-box { text-align: left; margin-top: 10px; max-width: 400px; margin-left: auto; margin-right: auto; }
        .print-info-box p { margin-bottom: 3px; font-size: 14px; color: #aaa; }
        .print-info-box strong { color: #ccc; }
        .print-dress { display: inline-block; background: rgba(255,255,255,0.05); border: 1px solid color-mix(in srgb, var(--print-accent) 35%, transparent); padding: 3px 12px; border-radius: 12px; font-size: 13px; color: #bbb; margin: 2px; }
        .print-schedule-line { display: flex; gap: 10px; margin-bottom: 3px; }
        .print-schedule-time { font-weight: 700; min-width: 50px; color: var(--print-accent); }
        .print-link { color: var(--print-accent); font-size: 13px; }
        .print-footer { font-size: 11px; color: #666; text-align: center; padding: 10px 0; position: relative; z-index: 1; }
        @media screen { .print-root { padding: 2rem; } }
      `}</style>

      {sectionOrder.includes("hero") && (
        <Section accent={accent} bg={bg}>
          {config.couplePhoto ? <img src={config.couplePhoto} alt="Foto de los novios" className="print-hero-pic" /> : null}
          <h1 className="print-hero-couple"><S>{config.firstName}</S> & <S>{config.secondName}</S></h1>
          <p className="print-hero-msg"><S>{config.inviteMessage}</S></p>
          {config.godparent1 && config.godparent2 ? (
            <p className="print-godparents">Con la bendición de sus padrinos <S>{config.godparent1}</S> y <S>{config.godparent2}</S></p>
          ) : null}
        </Section>
      )}

      {sectionOrder.includes("details") && (
        <Section eyebrow="Fecha y lugar" title={formattedDate} accent={accent} bg={bg}>
          {timeStr ? <p className="print-body print-body--tight">Hora de la celebración: {timeStr}h</p> : null}
          {place ? <p className="print-body print-body--tight"><S>{place}</S></p> : null}
          {mapsUrl ? <p className="print-body print-body--tight"><a href={mapsUrl} className="print-link">Ver ubicación en Google Maps</a></p> : null}
          <p className="print-body print-body--tight" style={{ marginTop: 12, fontStyle: "italic" }}>Te esperamos para compartir este momento tan especial.</p>
          {config.transportInfo ? (
            <div className="print-info-box">
              <p><strong>Transporte</strong></p>
              <p className="print-body print-body--tight"><S>{config.transportInfo}</S></p>
            </div>
          ) : null}
        </Section>
      )}

      {sectionOrder.includes("info") && (
        <Section eyebrow="Sobre los invitados" title="Horario de la celebración" accent={accent} bg={bg}>
          {config.weddingSchedule ? (
            <div className="print-info-box">
              {config.weddingSchedule.split("\n").filter(Boolean).map((line, i) => {
                const m = line.match(/^(\d{1,2}:\d{2})\s*(.*)/);
                return m
                  ? <div key={i} className="print-schedule-line"><span className="print-schedule-time">{m[1]}</span><span>{m[2]}</span></div>
                  : <p key={i}>{line}</p>;
              })}
            </div>
          ) : <p className="print-body print-body--tight">El horario detallado se compartirá próximamente.</p>}
          <div className="print-divider" />
          <h3 className="print-subtitle">Código de vestimenta</h3>
          {config.weddingDressCode ? (
            <div style={{ marginTop: 6 }}>
              {config.weddingDressCode.split(",").map((d, i) => <span key={i} className="print-dress"><S>{d.trim()}</S></span>)}
            </div>
          ) : <p className="print-body print-body--tight">Se comunicará más adelante.</p>}
          {config.kidsPolicy ? (
            <>
              <div className="print-divider" />
              <h3 className="print-subtitle">Sobre los niños</h3>
              <p className="print-body print-body--tight"><S>{config.kidsPolicy}</S></p>
            </>
          ) : null}
        </Section>
      )}

      {sectionOrder.includes("story") && (
        <Section eyebrow="Nuestra historia" title="Cómo empezó todo" accent={accent} bg={bg}>
          <p className="print-body"><S>{config.storyText || "La historia se compartirá pronto."}</S></p>
        </Section>
      )}

      {sectionOrder.includes("gifts") && (
        <Section eyebrow="Regalos" title="Tu presencia es el mejor regalo" accent={accent} bg={bg}>
          <p className="print-body"><S>{config.giftsInfo || "La información sobre regalos se compartirá próximamente."}</S></p>
          {config.bankInfo ? (
            <div className="print-info-box" style={{ marginTop: 12 }}>
              <p><strong>Datos bancarios</strong></p>
              <p className="print-body print-body--tight"><S>{config.bankInfo}</S></p>
            </div>
          ) : null}
        </Section>
      )}

      {sectionOrder.includes("accommodation") && (
        <Section eyebrow="Alojamiento" title="Dónde alojarse" accent={accent} bg={bg}>
          <p className="print-body"><S>{config.accommodationInfo || "La información sobre alojamiento se compartirá próximamente."}</S></p>
        </Section>
      )}

      <p className="print-footer">Wedingo</p>
    </div>
  );
}
