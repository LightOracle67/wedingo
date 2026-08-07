import { useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "../contexts";
import { useTranslation } from "react-i18next";
import { randomMessage } from "../lib/invite-messages";
import { MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import "../styles/print.css";

export default function PrintPage() {
  const { t, i18n } = useTranslation();
  const { config, isConfigLoading, inviteToken } = useConfig();

  const printed = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {

    document.title = `${config.firstName} & ${config.secondName} — Wedingo`;
  }, [config.firstName, config.secondName]);

  // La fecha se construye con MONTH_VALUE_TO_NUMBER (fuente única) y se valida
  // el rollover: antes un monthMap local solo en español y un "31 de febrero"
  // podían imprimir una fecha errónea (enero/3 de marzo).
  const weddingDateObj = (() => {
    if (!config.weddingDay || !config.weddingMonth || !config.weddingYear) return null;
    const monthIndex = MONTH_VALUE_TO_NUMBER[config.weddingMonth];
    if (!monthIndex) return null;
    const day = Number(config.weddingDay);
    const year = Number(config.weddingYear);
    const date = new Date(year, monthIndex - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex - 1 || date.getDate() !== day) return null;
    return date;
  })();
  const formattedDate = weddingDateObj ? weddingDateObj.toLocaleDateString(i18n.language || "es", { dateStyle: "long" }) : "";
  const timeStr = config.weddingHour
    ? `${String(config.weddingHour).padStart(2, "0")}:${String(config.weddingMinute || "0").padStart(2, "0")}`
    : "";
  const place = config.weddingPlace || "";

  // Mensaje de la tarjeta: fijo por invitación (sessionStorage) para que el
  // PDF imprimido sea estable y coincida con el del sobre. Un mensaje
  // aleatorio por carga generaba PDFs distintos en cada impresión.
  const message = useMemo(() => {
    const key = `wedin_print_msg_${inviteToken || ""}_${i18n.language || "es"}`;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) return stored;
    } catch { /* almacenamiento no disponible */ }
    const raw = randomMessage(i18n.language ?? "es") ?? "";
    try { sessionStorage.setItem(key, raw); } catch { /* noop */ }
    return raw;
  }, [i18n.language, inviteToken]);

  useEffect(() => {
    if (isConfigLoading) {

      return;
    }

    const id = setTimeout(() => {

      setLoaded(true);
    }, 200);
    return () => {

      clearTimeout(id);
    };
  }, [isConfigLoading]);

  useEffect(() => {
    if (!loaded || printed.current) {

      return;
    }
    printed.current = true;

    const doPrint = async () => {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 400));
      const cleanup = () => {
        // Solo se cierra la pestaña si se abrió desde el panel (window.open):
        // una pestaña abierta directamente no se puede cerrar y el navegador
        // lo bloquea (antes quedaba colgada tras imprimir).
        if (window.opener) {
          try { window.close(); } catch (err) { console.error("[app]", "[PrintPage]", "window close error", err); }
        }
      };
      window.onafterprint = cleanup;
      window.onbeforeunload = null;

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
