import { useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { THEME_PREVIEW_COLORS } from "../lib/constants";
import { parseSectionOrder } from "../lib/section-utils";
import eucalyptusSrc from "../assets/eucalyptus.png";
import ringsSrc from "../assets/rings.png";

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderHero(c, accent) {
  const pic = c.couplePhoto ? `<img src="${esc(c.couplePhoto)}" alt="Foto de los novios" class="hero-pic" />` : "";
  const rings = `<img src="${ringsSrc}" alt="" class="rings" />`;
  const gp = c.godparent1 && c.godparent2
    ? `<p class="godparents">Con la bendición de sus padrinos ${esc(c.godparent1)} y ${esc(c.godparent2)}</p>`
    : "";
  return `<div class="page page--hero">
    <div class="page-bg"></div>
    <div class="deco deco--left"><img src="${eucalyptusSrc}" alt="" /></div>
    <div class="deco deco--right"><img src="${eucalyptusSrc}" alt="" /></div>
    <div class="card card--hero">
      ${pic}
      ${rings}
      <h1 class="hero-couple">${esc(c.firstName)} & ${esc(c.secondName)}</h1>
      <p class="hero-msg">${esc(c.inviteMessage)}</p>
      ${gp}
      <div class="divider" style="background:${accent}"></div>
    </div>
  </div>`;
}

function renderSection(eyebrow, title, content, accent, extraClass) {
  return `<div class="page">
    <div class="page-bg"></div>
    <div class="deco deco--left"><img src="${eucalyptusSrc}" alt="" /></div>
    <div class="deco deco--right"><img src="${eucalyptusSrc}" alt="" /></div>
    <div class="card${extraClass ? " " + extraClass : ""}">
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h2 class="title">${esc(title)}</h2>
      <div class="divider" style="background:${accent}"></div>
      ${content}
    </div>
  </div>`;
}

function renderDetails(c, accent) {
  const date = c.formattedDate || "Fecha por definir";
  const time = c.weddingHour ? `${c.weddingHour}:${String(c.weddingMinute || "0").padStart(2, "0")}` : "";
  const timeLabel = time ? ` · ${time}h` : "";
  const place = c.weddingPlace || (c.weddingLatitude ? `${c.weddingLatitude}, ${c.weddingLongitude}` : "");
  const mapsUrl = c.weddingLatitude ? `https://www.google.com/maps?q=${c.weddingLatitude},${c.weddingLongitude}` : "";

  let content = `<p class="body">${esc(date)}${timeLabel}</p>`;
  if (place) content += `<p class="body body--tight">${esc(place)}</p>`;
  if (mapsUrl) content += `<p class="body body--tight"><a href="${esc(mapsUrl)}" class="link">Ver ubicación en Google Maps</a></p>`;
  content += `<p class="body body--tight" style="margin-top:12px;font-style:italic">Te esperamos para compartir este momento tan especial.</p>`;
  if (c.transportInfo) content += `<div class="info-box"><p><strong>Transporte</strong></p><p class="body body--tight">${esc(c.transportInfo)}</p></div>`;

  return renderSection("Fecha y lugar", date, content, accent);
}

function renderInfo(c, accent) {
  const schedule = c.weddingSchedule
    ? c.weddingSchedule.split("\n").filter(Boolean).map(line => {
        const m = line.match(/^(\d{1,2}:\d{2})\s*(.*)/);
        return m
          ? `<div class="schedule-line"><span class="schedule-time">${esc(m[1])}</span><span>${esc(m[2])}</span></div>`
          : `<p>${esc(line)}</p>`;
      }).join("")
    : `<p class="body body--tight">El horario detallado se compartirá próximamente.</p>`;

  const dress = c.weddingDressCode
    ? c.weddingDressCode.split(",").map(d => `<span class="dress-code" style="border-color:${accent}">${esc(d.trim())}</span>`).join(" ")
    : `<p class="body body--tight">Se comunicará más adelante.</p>`;

  let content = `<div class="info-box">${schedule}</div>`;
  content += `<div class="divider" style="background:${accent};margin:14px auto"></div>`;
  content += `<h3 class="subtitle">Código de vestimenta</h3><div style="margin-top:6px">${dress}</div>`;
  if (c.kidsPolicy) content += `<div class="divider" style="background:${accent};margin:14px auto"></div><h3 class="subtitle">Sobre los niños</h3><p class="body body--tight">${esc(c.kidsPolicy)}</p>`;

  return renderSection("Sobre los invitados", "Horario de la celebración", content, accent);
}

function renderStory(c, accent) {
  return renderSection("Nuestra historia", "Cómo empezó todo",
    `<p class="body">${esc(c.storyText || "La historia se compartirá pronto.")}</p>`, accent);
}

function renderGifts(c, accent) {
  let content = `<p class="body">${esc(c.giftsInfo || "La información sobre regalos se compartirá próximamente.")}</p>`;
  if (c.bankInfo) content += `<div class="info-box" style="margin-top:12px"><p><strong>Datos bancarios</strong></p><p class="body body--tight">${esc(c.bankInfo)}</p></div>`;
  return renderSection("Regalos", "Tu presencia es el mejor regalo", content, accent);
}

function renderAccommodation(c, accent) {
  return renderSection("Alojamiento", "Dónde alojarse",
    `<p class="body">${esc(c.accommodationInfo || "La información sobre alojamiento se compartirá próximamente.")}</p>`, accent);
}

export default function PrintPage() {
  const { inviteToken } = useParams();
  const { config, isConfigLoading, formattedDate } = useApp();
  const printed = useRef(false);

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

  useEffect(() => {
    if (isConfigLoading || printed.current) return;
    printed.current = true;

    const doPrint = async () => {
      await document.fonts.ready;
      await new Promise(r => { if (document.readyState === "complete") r(); else window.addEventListener("load", r, { once: true }); });

      const w = window.open("", "_blank");
      if (!w) return;

      const c = {
        firstName: config.firstName, secondName: config.secondName,
        inviteMessage: config.inviteMessage, couplePhoto: config.couplePhoto,
        godparent1: config.godparent1, godparent2: config.godparent2,
        weddingPlace: config.weddingPlace, weddingLatitude: config.weddingLatitude,
        weddingLongitude: config.weddingLongitude,
        weddingHour: config.weddingHour, weddingMinute: config.weddingMinute || "00",
        formattedDate: formattedDate,
        weddingSchedule: config.weddingSchedule,
        weddingDressCode: config.weddingDressCode,
        kidsPolicy: config.kidsPolicy,
        storyText: config.storyText,
        giftsInfo: config.giftsInfo, bankInfo: config.bankInfo,
        accommodationInfo: config.accommodationInfo,
        transportInfo: config.transportInfo,
      };

      const renderers = {
        hero: (c) => renderHero(c, accent),
        details: (c) => renderDetails(c, accent),
        info: (c) => renderInfo(c, accent),
        story: (c) => renderStory(c, accent),
        gifts: (c) => renderGifts(c, accent),
        accommodation: (c) => renderAccommodation(c, accent),
      };

      const pages = sectionOrder.map(s => (renderers[s] || (() => ""))(c)).join("\n");

      const ac = accent.replace("#", "");
      const bc = bg.replace("#", "");
      const template = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(c.firstName)} & ${esc(c.secondName)}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:ital@0;1&display=swap">
        <style>
          @page { margin: 0; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: "Lora", Georgia, serif; color: #ccc; background: #${bc}; line-height: 1.6; }
          .page { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem 2rem; page-break-after: always; overflow: hidden; }
          .page:last-child { page-break-after: auto; }
          .page-bg { position: absolute; inset: 0; background: linear-gradient(150deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0) 100%); z-index: 0; }
          .card { position: relative; z-index: 1; background: rgba(255,255,255,0.08); border: 1px solid ${accent}44; border-radius: 1.4rem; padding: 2.5rem 2rem; max-width: 480px; width: 100%; text-align: center; backdrop-filter: blur(4px); }
          .card::after { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, ${accent}88, transparent); border-radius: 2px; }
          .card--hero { padding-top: 3rem; }
          .deco { position: absolute; top: 50%; z-index: 0; opacity: 0.25; }
          .deco--left { left: -2rem; transform: translateY(-50%) scale(-1, -1); }
          .deco--right { right: -2rem; transform: translateY(-50%); }
          .deco img { width: 14rem; height: auto; }
          .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: ${accent}; margin-bottom: 10px; }
          .title { font-family: "Playfair Display", Georgia, serif; font-size: 26px; color: #eee; margin-bottom: 6px; line-height: 1.2; }
          .subtitle { font-family: "Playfair Display", Georgia, serif; font-size: 18px; color: #ddd; margin-bottom: 6px; }
          .body { font-size: 15px; color: #bbb; max-width: 400px; white-space: pre-line; margin: 0 auto; }
          .body--tight { font-size: 14px; margin-top: 4px; color: #aaa; }
          .hero-couple { font-size: 44px; font-family: "Playfair Display", Georgia, serif; font-weight: 700; color: #f0e6d0; margin-bottom: 8px; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
          .hero-msg { font-size: 16px; color: #c8b898; max-width: 400px; margin: 0 auto 14px; font-style: italic; }
          .hero-pic { max-width: 180px; max-height: 180px; border-radius: 50%; object-fit: cover; margin: 0 auto 20px; border: 2px solid ${accent}66; }
          .rings { width: 80px; margin: 0 auto 14px; opacity: 0.6; }
          .godparents { font-size: 14px; color: #999; font-style: italic; }
          .divider { width: 60px; height: 1px; margin: 12px auto; }
          .info-box { text-align: left; margin-top: 10px; max-width: 400px; margin-left: auto; margin-right: auto; }
          .info-box p { margin-bottom: 3px; font-size: 14px; color: #aaa; }
          .info-box strong { color: #ccc; }
          .dress-code { display: inline-block; background: rgba(255,255,255,0.06); border: 1px solid ${accent}55; padding: 3px 12px; border-radius: 12px; font-size: 13px; color: #bbb; margin: 2px; }
          .schedule-line { display: flex; gap: 10px; margin-bottom: 3px; }
          .schedule-time { font-weight: 700; min-width: 50px; color: ${accent}; }
          .link { color: ${accent}; font-size: 13px; }
          .footer { font-size: 11px; color: #666; text-align: center; padding: 10px 0; position: relative; z-index: 1; }
</style></head><body>${pages}<p class="footer">Wedingo</p></body></html>`;

      w.document.write(template);
      w.document.close();

      const imgs = w.document.querySelectorAll("img");
      await Promise.all(Array.from(imgs).map(img => new Promise(resolve => {
        if (img.complete) resolve();
        else { img.onload = resolve; img.onerror = resolve; }
      })));

      await new Promise(r => setTimeout(r, 500));
      w.onafterprint = () => { try { w.close(); } catch {} };
      w.focus();
      w.print();
    };

    doPrint();
  }, [isConfigLoading]);

  if (isConfigLoading) {
    return <div style={{ padding: "2rem", textAlign: "center", fontFamily: "Georgia, serif", color: "#888" }}>Preparando impresión...</div>;
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "Georgia, serif", color: "#444" }}>
      <p>La impresión se ha abierto en una nueva ventana.</p>
      <p style={{ fontSize: "14px", color: "#888", marginTop: "8px" }}>Si no se abre, permite las ventanas emergentes y recarga.</p>
    </div>
  );
}
