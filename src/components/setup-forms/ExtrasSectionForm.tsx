import { memo, useCallback, type ReactNode  } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField, useFormStore } from "../../contexts";
import { useLinesField } from "../../hooks/useLinesField";
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
  // Toggles de funciones sociales (estado visible: antes faltaban los hooks y
  // el checkbox nunca reflejaba el valor guardado).
  const reactionsEnabled = useFormField("reactionsEnabled");
  const rideShareEnabled = useFormField("rideShareEnabled");
  const notesEnabled = useFormField("notesEnabled");
  const musicPollEnabled = useFormField("musicPollEnabled");
  // Prueba social en vivo en la portada.
  const liveConfirmedEnabled = useFormField("liveConfirmedEnabled");
  // Lista pública de confirmados en la portada (opt-in de nombres).
  const showConfirmedPeople = useFormField("showConfirmedPeople");
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
    reactionsEnabled,
    rideShareEnabled,
    notesEnabled,
    musicPollEnabled,
    liveConfirmedEnabled,
    showConfirmedPeople,
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

  /** Editor de la lista de regalos (JSON de {id,name,description,type}): se
   *  edita como líneas "nombre | descripción | tipo" y se convierte a JSON al
   *  guardar. El tipo es opcional: solo se escribe cuando es "experiencia"
   *  (las líneas antiguas siguen siendo "nombre | descripción"). */
  const { toLines: giftToLines, parseText: giftParseText } = useLinesField<{
    id: string;
    name: string;
    description: string;
    type?: string;
  }>({
    parseLine: (line) => {
      const [name, ...rest] = line.split("|");
      const lastSeg = (rest[rest.length - 1] ?? "").trim().toLowerCase();
      // El tercer segmento solo es una experiencia si dice "experiencia"
      // (o su equivalente en inglés); en cualquier otro caso es descripción.
      const isExperience = lastSeg === "experiencia" || lastSeg === "experience";
      const description = (isExperience ? rest.slice(0, -1).join("|") : rest.join("|")).trim().slice(0, 200);
      return {
        id: `g${Math.random().toString(36).slice(2, 8)}`,
        name: (name || "").trim().slice(0, 100),
        description,
        type: isExperience ? "experiencia" : "regalo",
      };
    },
    itemToLine: (g) =>
      g.type === "experiencia" ? `${g.name ?? ""} | ${g.description ?? ""} | experiencia` : `${g.name ?? ""} | ${g.description ?? ""}`,
    maxLines: 50,
  });
  const giftListLines = giftToLines(giftList || "");
  const setGiftList = useCallback(
    (text: string) => updateFormField("giftList", giftParseText(text)),
    [giftParseText, updateFormField],
  );

  /** Editor de la trivia (JSON de {q,a}): líneas "pregunta | respuesta". */
  const { toLines: triviaToLines, parseText: triviaParseText } = useLinesField<{ q: string; a: string }>({
    parseLine: (line) => {
      const [q, ...rest] = line.split("|");
      return { q: (q || "").trim().slice(0, 200), a: rest.join("|").trim().slice(0, 200) };
    },
    itemToLine: (tr) => `${tr.q ?? ""} | ${tr.a ?? ""}`,
    maxLines: 50,
  });
  const triviaLines = triviaToLines(trivia || "");
  const setTrivia = useCallback(
    (text: string) => updateFormField("trivia", triviaParseText(text)),
    [triviaParseText, updateFormField],
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

        {/* Prueba social en vivo: cuántos han confirmado */}
        {renderToggleRow("liveConfirmed", t("setup.liveConfirmedLabel"), t("setup.liveConfirmedHint"))}

        {/* Visibilidad de la lista de confirmados (opt-in de nombres) */}
        {renderToggleRow("showConfirmedPeople", t("setup.showConfirmedPeopleLabel"), t("setup.showConfirmedPeopleHint"))}

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

