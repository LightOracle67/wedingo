import { useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";

/**
 * ExtrasSectionForm — Configura las funciones sociales de la invitación:
 * fecha límite de RSVP, reacciones, lista de regalos, compartir coche,
 * vídeo de bienvenida, muro de dedicatorias, encuesta de música y trivia.
 *
 * Layout de cada extra: el checkbox va SIEMPRE delante de su título (para
 * que la activación se vea a simple vista) y, cuando está activado, su input
 * aparece debajo del hint. Si el checkbox no está marcado, no hay input.
 */
export default function ExtrasSectionForm({ prefix = "" }: { prefix?: string }) {
  const { formData, updateFormField } = useApp();
  const { t } = useTranslation();
  const id = (name: string) => `${prefix}${name}`;

  // Toggle genérico para los switches.
  const toggle = useCallback((field: string) => () => {
    updateFormField(field, formData[field] === "true" ? "false" : "true");
  }, [formData, updateFormField]);

  /** Editor de la lista de regalos (JSON de {id,name,description}): se edita
   *  como líneas "nombre | descripción" y se convierte a JSON al guardar. */
  const giftListLines = (() => {
    try {
      const parsed = JSON.parse(formData.giftList || "[]");
      return Array.isArray(parsed) ? parsed.map((g: { name?: string; description?: string }) => `${g.name ?? ""} | ${g.description ?? ""}`).join("\n") : "";
    } catch { return ""; }
  })();
  const setGiftList = useCallback((text: string) => {
    const items = text.split("\n").map((line) => line.trim()).filter(Boolean)
      .map((line) => {
        const [name, ...rest] = line.split("|");
        return { id: `g${Math.random().toString(36).slice(2, 8)}`, name: (name || "").trim().slice(0, 100), description: rest.join("|").trim().slice(0, 200) };
      });
    updateFormField("giftList", JSON.stringify(items));
  }, [updateFormField]);

  /** Editor de la trivia (JSON de {q,a}): líneas "pregunta | respuesta". */
  const triviaLines = (() => {
    try {
      const parsed = JSON.parse(formData.trivia || "[]");
      return Array.isArray(parsed) ? parsed.map((tr: { q?: string; a?: string }) => `${tr.q ?? ""} | ${tr.a ?? ""}`).join("\n") : "";
    } catch { return ""; }
  })();
  const setTrivia = useCallback((text: string) => {
    const items = text.split("\n").map((line) => line.trim()).filter(Boolean)
      .map((line) => {
        const [q, ...rest] = line.split("|");
        return { q: (q || "").trim().slice(0, 200), a: rest.join("|").trim().slice(0, 200) };
      });
    updateFormField("trivia", JSON.stringify(items));
  }, [updateFormField]);

  /** Fila de extra: checkbox primero y título + hint después. */
  const ToggleRow = ({ field, label, hint, children }: { field: string; label: string; hint?: string; children?: ReactNode }) => (
    <div className="setup-toggle-row">
      <input type="checkbox" className="setup-toggle" id={id(`${field}Toggle`)} checked={formData[`${field}Enabled`] === "true"} onChange={toggle(`${field}Enabled`)} aria-label={label} />
      <div>
        <label className="setup-label setup-label--tight" htmlFor={id(`${field}Toggle`)}>{label}</label>
        {hint ? <p className="setup-help setup-help--tight">{hint}</p> : null}
      </div>
      {children}
    </div>
  );

  return (
    <>
      <fieldset className="setup-fieldset">
        <legend className="setup-label">{t("setup.extrasLegend")}</legend>
        <p className="setup-help">{t("setup.extrasHint")}</p>

        {/* Fecha límite de RSVP */}
        <ToggleRow field="rsvpDeadline" label={t("setup.rsvpDeadlineLabel")} hint={t("setup.rsvpDeadlineHint")} />
        {formData.rsvpDeadlineEnabled === "true" ? (
          <input id={id("rsvpDeadline")} className="setup-input" type="date" value={formData.rsvpDeadline || ""} onChange={(e) => updateFormField("rsvpDeadline", e.target.value)} />
        ) : null}

        {/* Reacciones */}
        <ToggleRow field="reactions" label={t("setup.reactionsLabel")} hint={t("setup.reactionsHint")} />

        {/* Lista de regalos */}
        <ToggleRow field="giftsList" label={t("setup.giftsListLabel")} hint={t("setup.giftsListHint")} />
        {formData.giftsListEnabled === "true" ? (
          <>
            <p className="setup-help" id={id("giftListHint")}>{t("setup.giftListEditorHint")}</p>
            <textarea id={id("giftList")} className="setup-textarea" rows={4} value={giftListLines} onChange={(e) => setGiftList(e.target.value)} aria-describedby={id("giftListHint")} />
          </>
        ) : null}

        {/* Compartir coche */}
        <ToggleRow field="rideShare" label={t("setup.rideShareLabel")} hint={t("setup.rideShareHint")} />

        {/* Vídeo de bienvenida */}
        <ToggleRow field="welcomeVideo" label={t("setup.welcomeVideoLabel")} hint={t("setup.welcomeVideoHint")} />
        {formData.welcomeVideoEnabled === "true" ? (
          <input id={id("welcomeVideo")} className="setup-input" type="url" inputMode="url" autoComplete="url"
            value={formData.welcomeVideo || ""} onChange={(e) => updateFormField("welcomeVideo", e.target.value.slice(0, 1000))}
            placeholder="https://..." />
        ) : null}

        {/* Muro de dedicatorias */}
        <ToggleRow field="notes" label={t("setup.notesLabel")} hint={t("setup.notesHint")} />

        {/* Encuesta de música */}
        <ToggleRow field="musicPoll" label={t("setup.musicPollLabel")} hint={t("setup.musicPollHint")} />

        {/* Trivia */}
        <ToggleRow field="trivia" label={t("setup.triviaLabel")} hint={t("setup.triviaHint")} />
        {formData.triviaEnabled === "true" ? (
          <>
            <p className="setup-help" id={id("triviaHint")}>{t("setup.triviaEditorHint")}</p>
            <textarea id={id("trivia")} className="setup-textarea" rows={4} value={triviaLines} onChange={(e) => setTrivia(e.target.value)} aria-describedby={id("triviaHint")} />
          </>
        ) : null}
      </fieldset>
    </>
  );
}
