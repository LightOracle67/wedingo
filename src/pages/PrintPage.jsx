import { useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { parseSectionOrder } from "../lib/section-utils";

const CSS = `
  @page { margin: 1.5cm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #222; background: #fff; line-height: 1.6; }
  .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1.5rem; page-break-after: always; text-align: center; }
  .page:last-child { page-break-after: auto; }
  .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #999; margin-bottom: 8px; }
  .title { font-family: "Playfair Display", Georgia, serif; font-size: 28px; margin-bottom: 12px; line-height: 1.2; }
  .subtitle { font-family: "Playfair Display", Georgia, serif; font-size: 20px; color: #555; margin-bottom: 8px; }
  .body { font-size: 15px; color: #444; max-width: 460px; white-space: pre-line; }
  .body--tight { font-size: 14px; margin-top: 4px; }
  .hero-couple { font-size: 42px; font-family: "Playfair Display", Georgia, serif; font-weight: 700; margin-bottom: 6px; }
  .hero-msg { font-size: 16px; color: #555; max-width: 400px; margin: 0 auto 12px; }
  .hero-pic { max-width: 200px; max-height: 200px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px; border: 3px solid #eee; }
  .godparents { font-size: 14px; color: #777; font-style: italic; }
  .divider { width: 60px; height: 1px; background: #ccc; margin: 10px auto; }
  .info-box { text-align: left; margin-top: 12px; max-width: 420px; }
  .info-box p { margin-bottom: 4px; font-size: 14px; }
  .info-box strong { color: #444; }
  .dress-code { display: inline-block; background: #f5f3ef; padding: 3px 10px; border-radius: 12px; font-size: 13px; margin: 2px; }
  .schedule-line { display: flex; gap: 8px; margin-bottom: 2px; }
  .schedule-time { font-weight: 700; min-width: 50px; color: #444; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; max-width: 700px; width: 100%; }
  .gallery img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 8px; border: 1px solid #eee; }
  .gallery-empty { color: #999; font-size: 14px; }
  .map-link { color: #555; font-size: 13px; text-decoration: underline; }
  .footer { font-size: 11px; color: #aaa; text-align: center; margin-top: 20px; padding-bottom: 10px; }
`;

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderHero(c) {
  const pic = c.couplePhoto ? `<img src="${esc(c.couplePhoto)}" alt="Foto de los novios" class="hero-pic" />` : "";
  const gp = c.godparent1 && c.godparent2
    ? `<p class="godparents">Con la bendición de sus padrinos ${esc(c.godparent1)} y ${esc(c.godparent2)}</p>`
    : "";
  return `<div class="page">
    ${pic}
    <h1 class="hero-couple">${esc(c.firstName)} & ${esc(c.secondName)}</h1>
    <p class="hero-msg">${esc(c.inviteMessage)}</p>
    ${gp}
    <div class="divider"></div>
  </div>`;
}

function renderDetails(c) {
  const place = c.weddingPlace || (c.weddingLatitude ? `Coordenadas: ${c.weddingLatitude}, ${c.weddingLongitude}` : "");
  const date = c.formattedDate || "Fecha por definir";
  const time = c.weddingHour ? `${c.weddingHour}:${String(c.weddingMinute || "0").padStart(2, "0")}` : "";
  const timeLabel = time ? ` · ${time}h` : "";
  const mapsUrl = c.weddingLatitude ? `https://www.google.com/maps?q=${c.weddingLatitude},${c.weddingLongitude}` : "";
  return `<div class="page">
    <p class="eyebrow">Fecha y lugar</p>
    <h2 class="title">${esc(date)}${timeLabel}</h2>
    ${place ? `<p class="body body--tight">${esc(place)}</p>` : ""}
    ${mapsUrl ? `<p class="body body--tight"><a href="${esc(mapsUrl)}" class="map-link">Ver en Google Maps</a></p>` : ""}
    ${c.transportInfo ? `<div class="info-box"><p><strong>Transporte</strong></p><p class="body body--tight">${esc(c.transportInfo)}</p></div>` : ""}
    <p class="body body--tight" style="margin-top:12px">Te esperamos para compartir este momento tan especial.</p>
  </div>`;
}

function renderInfo(c) {
  const schedule = c.weddingSchedule
    ? c.weddingSchedule.split("\n").filter(Boolean).map(line => {
        const m = line.match(/^(\d{1,2}:\d{2})\s*(.*)/);
        return m ? `<div class="schedule-line"><span class="schedule-time">${esc(m[1])}</span><span>${esc(m[2])}</span></div>` : `<p>${esc(line)}</p>`;
      }).join("")
    : `<p class="body body--tight">El horario detallado se compartirá próximamente.</p>`;
  const dress = c.weddingDressCode
    ? c.weddingDressCode.split(",").map(d => `<span class="dress-code">${esc(d.trim())}</span>`).join(" ")
    : `<p class="body body--tight">El código de vestimenta se comunicará más adelante.</p>`;
  return `<div class="page">
    <p class="eyebrow">Sobre los invitados</p>
    <h2 class="title">Horario de la celebración</h2>
    <div class="info-box">${schedule}</div>
    <div class="divider"></div>
    <h3 class="subtitle">Código de vestimenta</h3>
    <div style="margin-top:6px">${dress}</div>
    ${c.kidsPolicy ? `<div class="divider"></div><h3 class="subtitle">Sobre los niños</h3><p class="body body--tight">${esc(c.kidsPolicy)}</p>` : ""}
  </div>`;
}

function renderStory(c) {
  return `<div class="page">
    <p class="eyebrow">Nuestra historia</p>
    <h2 class="title">Cómo empezó todo</h2>
    <p class="body">${esc(c.storyText || "La historia se compartirá pronto.")}</p>
  </div>`;
}

function renderGifts(c) {
  return `<div class="page">
    <p class="eyebrow">Regalos</p>
    <h2 class="title">Tu presencia es el mejor regalo</h2>
    <p class="body">${esc(c.giftsInfo || "La información sobre regalos se compartirá próximamente.")}</p>
    ${c.bankInfo ? `<div class="info-box" style="margin-top:8px"><p><strong>Datos bancarios</strong></p><p class="body body--tight">${esc(c.bankInfo)}</p></div>` : ""}
  </div>`;
}

function renderAccommodation(c) {
  return `<div class="page">
    <p class="eyebrow">Alojamiento</p>
    <h2 class="title">Dónde alojarse</h2>
    <p class="body">${esc(c.accommodationInfo || "La información sobre alojamiento se compartirá próximamente.")}</p>
  </div>`;
}

function renderGallery(images) {
  if (!images || images.length === 0) {
    return `<div class="page">
      <p class="eyebrow">Galería</p>
      <h2 class="title">Nuestros momentos</h2>
      <p class="gallery-empty">Pronto compartiremos nuestras fotos.</p>
    </div>`;
  }
  const imgs = images.map((src, i) => `<img src="${esc(src)}" alt="Foto ${i + 1}" />`).join("");
  return `<div class="page">
    <p class="eyebrow">Galería</p>
    <h2 class="title">Nuestros momentos</h2>
    <div class="gallery">${imgs}</div>
  </div>`;
}

export default function PrintPage() {
  const { inviteToken } = useParams();
  const { config, isConfigLoading, formattedDate } = useApp();
  const printed = useRef(false);
  const galleryImages = useRef([]);

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

    const loadGallery = async () => {
      try {
        const { getDocs, collection } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");
        const { decrypt } = await import("../lib/crypto-utils");
        const snap = await getDocs(collection(db, "invitations", inviteToken, "gallery"));
        const result = [];
        for (const doc of snap.docs) {
          const d = doc.data();
          if (d.data) {
            try {
              const decrypted = await decrypt(d.data, inviteToken);
              result.push(decrypted);
            } catch { result.push(d.data); }
          }
        }
        galleryImages.current = result;
      } catch {}
    };

    const doPrint = async () => {
      await document.fonts.ready;
      await new Promise(r => { if (document.readyState === "complete") r(); else window.addEventListener("load", r, { once: true }); });
      await loadGallery();

      const w = window.open("", "_blank");
      if (!w) return;

      const c = {
        firstName: config.firstName, secondName: config.secondName,
        inviteMessage: config.inviteMessage, couplePhoto: config.couplePhoto,
        godparent1: config.godparent1, godparent2: config.godparent2,
        weddingPlace: config.weddingPlace, weddingLatitude: config.weddingLatitude,
        weddingLongitude: config.weddingLongitude,
        weddingHour: config.weddingHour, weddingMinute: config.weddingMinute,
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
        hero: renderHero, details: renderDetails, info: renderInfo,
        story: renderStory, gifts: renderGifts, accommodation: renderAccommodation,
      };

      const pages = sectionOrder.map(s => {
        if (s === "gallery") return renderGallery(galleryImages.current);
        return (renderers[s] || (() => ""))(c);
      }).join("\n");

      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(c.firstName)} & ${esc(c.secondName)}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap">
        <style>${CSS}</style></head><body>${pages}<p class="footer">Wedingo</p></body></html>`;

      w.document.write(html);
      w.document.close();

      const imgs = w.document.querySelectorAll("img");
      await Promise.all(Array.from(imgs).map(img => new Promise(resolve => {
        if (img.complete) resolve();
        else { img.onload = resolve; img.onerror = resolve; }
      })));

      await new Promise(r => setTimeout(r, 300));
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
