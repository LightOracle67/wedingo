import { useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "../contexts";
import { useTranslation } from "react-i18next";
import { randomMessage } from "../lib/invite-messages";
import { MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import { SITE_URL } from "../lib/seo";
import "../styles/print.css";

export default function PrintPage() {
  const { t, i18n } = useTranslation();
  const { config, isConfigLoading, inviteToken } = useConfig();

  const printed = useRef(false);
  const [loaded, setLoaded] = useState(false);
  // QR de la invitación: se genera en lazy (no se precachea) y, si falla
  // (canvas/worker bloqueado), la tarjeta se imprime igualmente sin QR.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // Promesa del QR: el flujo de impresión la espera (con timeout) para que el
  // PDF impreso incluya el QR, pero nunca bloquea la impresión si falla.
  const qrPromiseRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    document.title = `${config.firstName} & ${config.secondName} — Wedingo`;
  }, [config.firstName, config.secondName]);

  // Impresión premium: se aplica el tema de la invitación para que la tarjeta
  // impresa herede sus colores (las variables CSS de los temas viven en
  // index.css y print.css las usa con fallback). Un tema desconocido/ausente
  // no rompe nada: el CSS tiene fallbacks.
  useEffect(() => {
    const theme = config.theme;
    if (theme) document.documentElement.dataset.weddingTheme = theme;
  }, [config.theme]);

  // URL pública de la invitación: base del sitio + token (si hay token).
  const inviteUrl = useMemo(() => (inviteToken ? `${SITE_URL}/${inviteToken}` : SITE_URL), [inviteToken]);

  useEffect(() => {
    let cancelled = false;
    qrPromiseRef.current = (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(inviteUrl, { width: 140, margin: 1, errorCorrectionLevel: "M" });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })().catch(() => {
      /* el QR es opcional: nunca bloquea la impresión */
    });
    return () => {
      cancelled = true;
    };
  }, [inviteUrl]);

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
  const formattedDate = weddingDateObj
    ? weddingDateObj.toLocaleDateString(i18n.language || "es", { dateStyle: "long" })
    : "";
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
    } catch {
      /* almacenamiento no disponible */
    }
    const raw = randomMessage(i18n.language ?? "es") ?? "";
    try {
      sessionStorage.setItem(key, raw);
    } catch {
      /* noop */
    }
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
      // Espera a que las imágenes (fondo y esquinas) estén DECODIFICADAS
      // (img.decode()) antes de imprimir; img.complete se cumple antes de
      // decodificar y un fondo aún sin decodificar salía negro en el papel.
      try {
        await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {})));
      } catch {}
      // Espera (con límite) a que el QR esté listo: la impresión nunca se
      // bloquea más de 800ms por un QR que tarda o falla.
      await Promise.race([qrPromiseRef.current, new Promise((r) => setTimeout(r, 800))]);
      await new Promise((r) => setTimeout(r, 300));
      const cleanup = () => {
        // Solo se cierra la pestaña si se abrió desde el panel (window.open):
        // una pestaña abierta directamente no se puede cerrar y el navegador
        // lo bloquea (antes quedaba colgada tras imprimir).
        if (window.opener) {
          try {
            window.close();
          } catch (err) {
            console.error("[app]", "[PrintPage]", "window close error", err);
          }
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
        <div
          className="print-card"
          style={
            config.backgroundImage
              ? { backgroundImage: `url("${config.backgroundImage}")` }
              : undefined
          }
        >
          {config.backgroundImage ? (
            <img
              src={config.backgroundImage}
              alt=""
              aria-hidden="true"
              className="print-card__bg"
              onError={(e) => {
                // Si la imagen falla, se oculta (un <img> vacío saldría negro).
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          {config.cornerDecoration ? (
            <>
              <img src={config.cornerDecoration} alt="" aria-hidden="true" className="print-corner print-corner--tl" />
              <img src={config.cornerDecoration} alt="" aria-hidden="true" className="print-corner print-corner--tr" />
              <img src={config.cornerDecoration} alt="" aria-hidden="true" className="print-corner print-corner--bl" />
              <img src={config.cornerDecoration} alt="" aria-hidden="true" className="print-corner print-corner--br" />
            </>
          ) : null}
          <div className="print-card__content">
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
            {timeStr ? (
              <p className="print-body" style={{ marginTop: "0.15rem" }}>
                {timeStr}
                {t("print.timeSuffix")}
              </p>
            ) : null}
            {place ? (
              <p className="print-body" style={{ marginTop: "0.15rem" }}>
                {place}
              </p>
            ) : null}
            {/* QR opcional: solo si se generó; un QR en blanco saldría roto. */}
            {qrDataUrl ? (
              <div className="print-qr" role="img" aria-label={t("print.qrLabel")}>
                <img src={qrDataUrl} alt="" width={140} height={140} />
                <p className="print-qr__hint">{t("print.qrHint")}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
