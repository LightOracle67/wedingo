import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";

/**
 * ExtrasSectionForm — Configura las funciones sociales de la invitación:
 * fecha límite de RSVP, reacciones, lista de regalos, compartir coche,
 * vídeo de bienvenida, muro de dedicatorias, encuesta de música y trivia.
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

  return (
    <>
      <fieldset className="setup-fieldset">
        <legend className="setup-label">{t("setup.extrasLegend")}</legend>
        <p className="setup-help">{t("setup.extrasHint")}</p>

        {/* Fecha límite de RSVP */}
        <div className="setup-toggle-row">
          <div>
            <label className="setup-label setup-label--tight" htmlFor={id("rsvpDeadline")}>{t("setup.rsvpDeadlineLabel")}</label>
            <p className="setup-help setup-help--tight">{t("setup.rsvpDeadlineHint")}</p>
          </div>
          <input type="checkbox" className="setup-toggle" id={id("rsvpDeadlineToggle")} checked={formData.rsvpDeadlineEnabled === "true"} onChange={toggle("rsvpDeadlineEnabled")} aria-label={t("setup.rsvpDeadlineLabel")} />
        </div>
        {formData.rsvpDeadlineEnabled === "true" ? (
          <input id={id("rsvpDeadline")} className="setup-input" type="date" value={formData.rsvpDeadline || ""} onChange={(e) => updateFormField("rsvpDeadline", e.target.value)} />
        ) : null}

        {/* Reacciones */}
        <div className="setup-toggle-row">
          <div>
            <label className="setup-label setup-label--tight" htmlFor={id("reactionsToggle")}>{t("setup.reactionsLabel")}</label>
            <p className="setup-help setup-help--tight">{t("setup.reactionsHint")}</p>
          </div>
          <input type="checkbox" className="setup-toggle" id={id("reactionsToggle")} checked={formData.reactionsEnabled === "true"} onChange={toggle("reactionsEnabled")} />
        </div>

        {/* Lista de regalos */}
        <div className="setup-toggle-row">
          <div>
            <label className="setup-label setup-label--tight" htmlFor={id("giftsListToggle")}>{t("setup.giftsListLabel")}</label>
            <p className="setup-help setup-help--tight">{t("setup.giftsListHint")}</p>
          </div>
          <input type="checkbox" className="setup-toggle" id={id("giftsListToggle")} checked={formData.giftsListEnabled === "true"} onChange={toggle("giftsListEnabled")} />
        </div>
        {formData.giftsListEnabled === "true" ? (
          <textarea id={id("giftList")} className="setup-textarea" rows={4} value={giftListLines} onChange={(e) => setGiftList(e.target.value)} aria-describedby={id("giftListHint")} />
        ) : null}
        {formData.giftsListEnabled === "true" ? <p className="setup-help" id={id("giftListHint")}>{t("setup.giftListEditorHint")}</p> : null}

        {/* Compartir coche */}
        <div className="setup-toggle-row">
          <div>
            <label className="setup-label setup-label--tight" htmlFor={id("rideShareToggle")}>{t("setup.rideShareLabel")}</label>
            <p className="setup-help setup-help--tight">{t("setup.rideShareHint")}</p>
          </div>
          <input type="checkbox" className="setup-toggle" id={id("rideShareToggle")} checked={formData.rideShareEnabled === "true"} onChange={toggle("rideShareEnabled")} />
        </div>

        {/* Vídeo de bienvenida */}
        <label className="setup-label" htmlFor={id("welcomeVideo")}>{t("setup.welcomeVideoLabel")}</label>
        <input id={id("welcomeVideo")} className="setup-input" type="url" inputMode="url" autoComplete="url"
          value={formData.welcomeVideo || ""} onChange={(e) => updateFormField("welcomeVideo", e.target.value.slice(0, 1000))}
          placeholder="https://..." aria-describedby={id("welcomeVideoHint")} />
        <p className="setup-help" id={id("welcomeVideoHint")}>{t("setup.welcomeVideoHint")}</p>

        {/* Muro de dedicatorias */}
        <div className="setup-toggle-row">
          <div>
            <label className="setup-label setup-label--tight" htmlFor={id("notesToggle")}>{t("setup.notesLabel")}</label>
            <p className="setup-help setup-help--tight">{t("setup.notesHint")}</p>
          </div>
          <input type="checkbox" className="setup-toggle" id={id("notesToggle")} checked={formData.notesEnabled === "true"} onChange={toggle("notesEnabled")} />
        </div>

        {/* Encuesta de música */}
        <div className="setup-toggle-row">
          <div>
            <label className="setup-label setup-label--tight" htmlFor={id("musicPollToggle")}>{t("setup.musicPollLabel")}</label>
            <p className="setup-help setup-help--tight">{t("setup.musicPollHint")}</p>
          </div>
          <input type="checkbox" className="setup-toggle" id={id("musicPollToggle")} checked={formData.musicPollEnabled === "true"} onChange={toggle("musicPollEnabled")} />
        </div>

        {/* Trivia */}
        <div className="setup-toggle-row">
          <div>
            <label className="setup-label setup-label--tight" htmlFor={id("triviaToggle")}>{t("setup.triviaLabel")}</label>
            <p className="setup-help setup-help--tight">{t("setup.triviaHint")}</p>
          </div>
          <input type="checkbox" className="setup-toggle" id={id("triviaToggle")} checked={formData.triviaEnabled === "true"} onChange={toggle("triviaEnabled")} />
        </div>
        {formData.triviaEnabled === "true" ? (
          <textarea id={id("trivia")} className="setup-textarea" rows={4} value={triviaLines} onChange={(e) => setTrivia(e.target.value)} aria-describedby={id("triviaHint")} />
        ) : null}
        {formData.triviaEnabled === "true" ? <p className="setup-help" id={id("triviaHint")}>{t("setup.triviaEditorHint")}</p> : null}
      </fieldset>
    </>
  );
}
