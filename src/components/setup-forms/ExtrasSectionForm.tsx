import { memo, useCallback, type ReactNode  } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField, useFormStore } from "../../contexts";
import SetupToggleRow from "../SetupToggleRow";

/**
 * ExtrasSectionForm â€” Configura las funciones sociales de la invitaciÃ³n:
 * fecha lÃ­mite de RSVP, reacciones, lista de regalos, compartir coche,
 * vÃ­deo de bienvenida, muro de dedicatorias, encuesta de mÃºsica y trivia.
 *
 * Layout de cada extra: el checkbox va SIEMPRE delante de su tÃ­tulo (para
 * que la activaciÃ³n se vea a simple vista) y, cuando estÃ¡ activado, su input
 * aparece debajo del hint. Si el checkbox no estÃ¡ marcado, no hay input.
 */
const ExtrasSectionForm = memo(function ExtrasSectionForm({ prefix = "" }: { prefix?: string }) {
  const { updateFormField } = useConfigActions();
  const formStore = useFormStore();
  const giftList = useFormField("giftList");
  const giftsListEnabled = useFormField("giftsListEnabled");
  const rsvpDeadline = useFormField("rsvpDeadline");
  const rsvpDeadlineEnabled = useFormField("rsvpDeadlineEnabled");
  const trivia = useFormField("trivia");
  const triviaEnabled = useFormField("triviaEnabled");
  const welcomeVideo = useFormField("welcomeVideo");
  const welcomeVideoEnabled = useFormField("welcomeVideoEnabled");
  const voiceNotesEnabled = useFormField("voiceNotesEnabled");
  const dayPhotosEnabled = useFormField("dayPhotosEnabled");
  const mailboxEnabled = useFormField("mailboxEnabled");
  const toastsEnabled = useFormField("toastsEnabled");
  const venueMapEnabled = useFormField("venueMapEnabled");
  const { t } = useTranslation();
  const id = (name: string) => `${prefix}${name}`;

  // Lookup de los *Enabled para el render de filas (los hooks no pueden
  // llamarse dentro del .map de renderToggleRow).
  const enabledMap: Record<string, string> = {
    giftsListEnabled,
    rsvpDeadlineEnabled,
    triviaEnabled,
    welcomeVideoEnabled,
    voiceNotesEnabled,
    dayPhotosEnabled,
    mailboxEnabled,
    toastsEnabled,
    venueMapEnabled,
  };

  // Toggle genérico para los switches: lee el valor ACTUAL del campo desde la
  // tienda (getField es síncrono y no necesita suscripción en el callback).
  const toggle = useCallback(
    (field: string) => () => {
      const current = formStore.getField(field);
      updateFormField(field, current === "true" ? "false" : "true");
    },
    [formStore, updateFormField],
  );

  /** Editor de la lista de regalos (JSON de {id,name,description}): se edita
   *  como lÃ­neas "nombre | descripciÃ³n" y se convierte a JSON al guardar. */
  const giftListLines = (() => {
    try {
      const parsed = JSON.parse(giftList || "[]");
      return Array.isArray(parsed)
        ? parsed
            .map((g: { name?: string; description?: string }) => `${g.name ?? ""} | ${g.description ?? ""}`)
            .join("\n")
        : "";
    } catch {
      return "";
    }
  })();
  const setGiftList = useCallback(
    (text: string) => {
      const items = text
        .split("\n")
        // Tope de líneas (evita que el JSON crezca sin límite en Firestore).
        .slice(0, 50)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, ...rest] = line.split("|");
          return {
            id: `g${Math.random().toString(36).slice(2, 8)}`,
            name: (name || "").trim().slice(0, 100),
            description: rest.join("|").trim().slice(0, 200),
          };
        });
      updateFormField("giftList", JSON.stringify(items));
    },
    [updateFormField],
  );

  /** Editor de la trivia (JSON de {q,a}): lÃ­neas "pregunta | respuesta". */
  const triviaLines = (() => {
    try {
      const parsed = JSON.parse(trivia || "[]");
      return Array.isArray(parsed)
        ? parsed.map((tr: { q?: string; a?: string }) => `${tr.q ?? ""} | ${tr.a ?? ""}`).join("\n")
        : "";
    } catch {
      return "";
    }
  })();
  const setTrivia = useCallback(
    (text: string) => {
      const items = text
        .split("\n")
        // Tope de líneas (evita que el JSON crezca sin límite en Firestore).
        .slice(0, 50)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [q, ...rest] = line.split("|");
          return { q: (q || "").trim().slice(0, 200), a: rest.join("|").trim().slice(0, 200) };
        });
      updateFormField("trivia", JSON.stringify(items));
    },
    [updateFormField],
  );

  /** Renders una fila de extra con el ToggleRow estable del módulo. */
  const renderToggleRow = (field: string, label: string, hint?: string, children?: ReactNode) => (
    <SetupToggleRow
      field={field}
      label={label}
      {...(hint !== undefined ? { hint } : {})}
      checked={enabledMap[`${field}Enabled`] === "true"}
      onToggle={toggle(`${field}Enabled`)}
      id={id}
    >
      {children}
    </SetupToggleRow>
  );

  return (
    <>
      <fieldset className="setup-fieldset">
        <legend className="setup-label">{t("setup.extrasLegend")}</legend>
        <p className="setup-help">{t("setup.extrasHint")}</p>

        {/* Fecha lÃ­mite de RSVP */}
        {renderToggleRow("rsvpDeadline", t("setup.rsvpDeadlineLabel"), t("setup.rsvpDeadlineHint"))}
        {rsvpDeadlineEnabled === "true" ? (
          <input
            id={id("rsvpDeadline")}
            className="setup-input"
            type="date"
            value={rsvpDeadline || ""}
            onChange={(e) => updateFormField("rsvpDeadline", e.target.value)}
          />
        ) : null}

        {/* Reacciones */}
        {renderToggleRow("reactions", t("setup.reactionsLabel"), t("setup.reactionsHint"))}

        {/* Lista de regalos */}
        {renderToggleRow("giftsList", t("setup.giftsListLabel"), t("setup.giftsListHint"))}
        {giftsListEnabled === "true" ? (
          <>
            <p className="setup-help" id={id("giftListHint")}>
              {t("setup.giftListEditorHint")}
            </p>
            <textarea
              id={id("giftList")}
              className="setup-textarea"
              rows={4}
              value={giftListLines}
              onChange={(e) => setGiftList(e.target.value)}
              aria-describedby={id("giftListHint")}
            />
          </>
        ) : null}

        {/* Compartir coche */}
        {renderToggleRow("rideShare", t("setup.rideShareLabel"), t("setup.rideShareHint"))}

        {/* VÃ­deo de bienvenida */}
        {renderToggleRow("welcomeVideo", t("setup.welcomeVideoLabel"), t("setup.welcomeVideoHint"))}
        {welcomeVideoEnabled === "true" ? (
          <input
            id={id("welcomeVideo")}
            className="setup-input"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={welcomeVideo || ""}
            onChange={(e) => updateFormField("welcomeVideo", e.target.value.slice(0, 1000))}
            placeholder={t("setup.welcomeVideoPlaceholder")}
          />
        ) : null}

        {/* Muro de dedicatorias */}
        {renderToggleRow("notes", t("setup.notesLabel"), t("setup.notesHint"))}

        {/* Encuesta de mÃºsica */}
        {renderToggleRow("musicPoll", t("setup.musicPollLabel"), t("setup.musicPollHint"))}

        {/* Trivia */}
        {renderToggleRow("trivia", t("setup.triviaLabel"), t("setup.triviaHint"))}
        {triviaEnabled === "true" ? (
          <>
            <p className="setup-help" id={id("triviaHint")}>
              {t("setup.triviaEditorHint")}
            </p>
            <textarea
              id={id("trivia")}
              className="setup-textarea"
              rows={4}
              value={triviaLines}
              onChange={(e) => setTrivia(e.target.value)}
              aria-describedby={id("triviaHint")}
            />
          </>
        ) : null}

        {/* Caja de recuerdos de voz */}
        {renderToggleRow("voiceNotes", t("setup.voiceNotesLabel"), t("setup.voiceNotesHint"))}

        {/* Fotos del día */}
        {renderToggleRow("dayPhotos", t("setup.dayPhotosLabel"), t("setup.dayPhotosHint"))}

        {/* Buzón privado */}
        {renderToggleRow("mailbox", t("setup.mailboxLabel"), t("setup.mailboxHint"))}

        {/* Brindis */}
        {renderToggleRow("toasts", t("setup.toastsLabel"), t("setup.toastsHint"))}

        {/* Mapa del recinto */}
        {renderToggleRow("venueMap", t("setup.venueMapLabel"), t("setup.venueMapHint"))}
      </fieldset>
    </>
  );
});

export default ExtrasSectionForm;

