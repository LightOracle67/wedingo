import { memo, useCallback, type ReactNode  } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField, useFormStore } from "../../contexts";
import { useLinesField } from "../../hooks/useLinesField";
import { useJsonArrayField } from "../../hooks/useJsonArrayField";
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
  // Distribución de mesas en la invitación pública.
  const tablesEnabled = useFormField("tablesEnabled");
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
    tablesEnabled,
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

  /** Editor estructurado de la trivia. Modelo de pregunta:
   *   - type "text": respuesta libre (correct como string).
   *   - type "single": una opción correcta (correct como string[1]).
   *   - type "multiple": varias opciones correctas (correct como string[]).
   *   Compatibilidad: las preguntas antiguas { q, a } se leen como type "text".
   */
  const triviaModel = useJsonArrayField<{
    q: string;
    type: "text" | "single" | "multiple";
    options?: string[];
    correct?: string | string[];
    a?: string;
    hint?: string;
    difficulty?: "easy" | "medium" | "hard";
  }>(
    trivia,
    (item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const it = item as { q?: unknown; type?: unknown; options?: unknown; correct?: unknown; a?: unknown; hint?: unknown; difficulty?: unknown };
      if (typeof it.q !== "string") return null;
      // Normaliza una opción: se conservan las cadenas (vacías incluidas,
      // para que el editor no pierda filas en blanco mientras se rellenan),
      // recortadas y con límite.
      const cleanOpts = (arr: unknown): string[] | undefined => {
        if (!Array.isArray(arr)) return undefined;
        const out = arr.map((o) => (typeof o === "string" ? o.trim() : "")).slice(0, 12);
        return out;
      };
      const cleanCorrect = (raw: unknown, type: string): string | string[] | undefined => {
        if (type === "text") {
          return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 200) : undefined;
        }
        if (Array.isArray(raw)) {
          const arr = raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean).slice(0, 12);
          return arr.length > 0 ? arr : undefined;
        }
        return undefined;
      };
      // type por defecto (retrocompatibilidad): si hay options → single, si no → text.
      const rawType = typeof it.type === "string" ? it.type : "";
      const type: "text" | "single" | "multiple" =
        rawType === "single" || rawType === "multiple" ? rawType : "text";
      const options = type === "text" ? undefined : cleanOpts(it.options);
      const correct = cleanCorrect(type === "text" ? it.correct ?? it.a : it.correct, type);
      const out: { q: string; type: "text" | "single" | "multiple"; options?: string[]; correct?: string | string[]; hint?: string; difficulty?: "easy" | "medium" | "hard" } = {
        q: it.q.trim().slice(0, 200),
        type,
      };
      // exactOptionalPropertyTypes: solo se añaden las claves con valor real.
      if (options) out.options = options;
      if (correct !== undefined && correct !== "") {
        if (Array.isArray(correct) && correct.length === 0) out.correct = undefined as never;
        else out.correct = correct;
      }
      if (typeof it.hint === "string" && it.hint.trim()) out.hint = it.hint.trim().slice(0, 200);
      const d = typeof it.difficulty === "string" ? it.difficulty : "";
      if (d === "easy" || d === "medium" || d === "hard") out.difficulty = d;
      return out;
    },
    50,
  );
  const triviaItems = triviaModel.items;
  // setItems es estable (no requiere re-ejecutar el callback cuando cambia).
  const triviaSetItems = triviaModel.setItems;

  /** Persiste un patch de una pregunta en el JSON del campo. */
  const updateTriviaItem = useCallback(
    (index: number, patch: Partial<{ q: string; type: "text" | "single" | "multiple"; options: string[]; correct: string | string[]; hint: string; difficulty: "easy" | "medium" | "hard" }>) => {
      const current = triviaItems[index];
      if (!current) return;
      updateFormField("trivia", triviaSetItems(triviaItems.map((it, i) => (i === index ? { ...it, ...patch } : it))));
    },
    [triviaItems, triviaSetItems, updateFormField],
  );

  /** Añade una pregunta nueva (por defecto tipo texto). */
  const addTriviaItem = useCallback(() => {
    // useJsonArrayField espera un callback (json:string)=>void; actualizamos
    // el campo "trivia" con el JSON nuevo.
    triviaModel.addItem({ q: "", type: "text" }, (json) => updateFormField("trivia", json));
  }, [triviaModel, updateFormField]);

  /** Elimina la pregunta del índice dado. */
  const removeTriviaItem = useCallback(
    (index: number) => triviaModel.removeItem(index, (json) => updateFormField("trivia", json)),
    [triviaModel, updateFormField],
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
          <div className="setup-token-card" style={{ marginTop: "0.4rem", padding: "0.6rem" }}>
            <p className="setup-help" id={id("triviaHint")}>
              {t("setup.triviaEditorHint")}
            </p>
            {triviaItems.length === 0 ? (
              <p className="setup-help">{t("setup.triviaEmpty")}</p>
            ) : null}
            {triviaItems.map((item, index) => {
              const isChoice = item.type !== "text";
              // correct: para texto es string; para elección, array de opciones.
              const correctArr = Array.isArray(item.correct) ? item.correct : isChoice && typeof item.correct === "string" ? [item.correct] : [];
              return (
                <div key={index} className="setup-token-card" style={{ margin: "0.4rem 0", padding: "0.6rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      className="setup-input"
                      style={{ flex: "1 1 14rem" }}
                      value={item.q}
                      maxLength={200}
                      onChange={(e) => updateTriviaItem(index, { q: e.target.value })}
                      placeholder={t("setup.triviaQuestionPlaceholder")}
                      aria-label={t("setup.triviaQuestionPlaceholder")}
                    />
                    <select
                      className="setup-input"
                      style={{ minWidth: "8rem" }}
                      value={item.type}
                      onChange={(e) => updateTriviaItem(index, { type: e.target.value as "text" | "single" | "multiple" })}
                      aria-label={t("setup.triviaTypeLabel")}
                    >
                      <option value="text">{t("setup.triviaTypeText")}</option>
                      <option value="single">{t("setup.triviaTypeSingle")}</option>
                      <option value="multiple">{t("setup.triviaTypeMultiple")}</option>
                    </select>
                    <button
                      type="button"
                      className="setup-button setup-button--danger setup-button--ghost setup-button--compact"
                      onClick={() => removeTriviaItem(index)}
                      aria-label={t("setup.triviaRemove")}
                    >
                      {t("setup.triviaDeleteRow")}
                    </button>
                  </div>

                  {item.type === "text" ? (
                    <input
                      className="setup-input"
                      style={{ marginTop: "0.4rem" }}
                      value={typeof item.correct === "string" ? item.correct : ""}
                      maxLength={200}
                      onChange={(e) => updateTriviaItem(index, { correct: e.target.value })}
                      placeholder={t("setup.triviaAnswerPlaceholder")}
                      aria-label={t("setup.triviaAnswerPlaceholder")}
                    />
                  ) : (
                    <TriviaOptionsEditor
                      type={item.type}
                      options={item.options || []}
                      correct={correctArr}
                      onChange={(patch: { options: string[]; correct: string[] }) =>
                        updateTriviaItem(index, { options: patch.options, correct: patch.correct })
                      }
                      t={t}
                    />
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="setup-button setup-button--compact"
              onClick={addTriviaItem}
              disabled={triviaItems.length >= 50}
            >
              {t("setup.triviaAdd")}
            </button>
          </div>
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

        {/* Distribución de mesas en la invitación pública */}
        {renderToggleRow("tables", t("setup.tablesLabel"), t("setup.tablesHint"))}
      </fieldset>
    </>
  );
});

export default ExtrasSectionForm;

/** Editor de las opciones de una pregunta de trivia de elección (single o
 *  multiple): lista de opciones + checkbox/radio para marcar cuáles son
 *  correctas. Actualiza el JSON de la pregunta vía `onChange`. */
function TriviaOptionsEditor({
  type,
  options,
  correct,
  onChange,
  t,
}: {
  type: "single" | "multiple";
  options: string[];
  correct: string[];
  onChange: (patch: { options: string[]; correct: string[] }) => void;
  t: (key: string) => string;
}) {
  const setOption = (i: number, value: string) => {
    const next = options.map((o, idx) => (idx === i ? value : o));
    onChange({ options: next, correct });
  };
  const toggleCorrect = (option: string) => {
    // single: solo puede haber UNA correcta (al marcar una se limpia el resto);
    // multiple: se puede marcar/desmarcar cualquiera.
    if (type === "single") {
      onChange({ options, correct: [option] });
      return;
    }
    const next = correct.includes(option) ? correct.filter((c) => c !== option) : [...correct, option];
    onChange({ options, correct: next });
  };
  const addOption = () => onChange({ options: [...options, ""], correct });
  const removeOption = (i: number) => {
    const removed = options[i] || "";
    const next = options.filter((_, idx) => idx !== i);
    onChange({ options: next, correct: correct.filter((c) => c !== removed) });
  };

  return (
    <div style={{ marginTop: "0.4rem" }} aria-label={t("setup.triviaOptionsLabel")}>
      <p className="setup-help" style={{ margin: "0 0 0.3rem" }}>
        {t("setup.triviaOptionsLabel")}
      </p>
      {options.map((opt, i) => {
        const inputType = type === "multiple" ? "checkbox" : "radio";
        const isCorrect = correct.includes(opt);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
            <input
              type={inputType}
              checked={isCorrect}
              onChange={() => toggleCorrect(opt)}
              aria-label={`${t("setup.triviaCorrectOption")} ${opt || `#${i + 1}`}`}
              style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
            />
            <input
              className="setup-input"
              style={{ flex: 1 }}
              value={opt}
              maxLength={200}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={t("setup.triviaOptionPlaceholder")}
              aria-label={t("setup.triviaOptionPlaceholder")}
            />
            <button
              type="button"
              className="setup-button setup-button--danger setup-button--ghost setup-button--compact"
              onClick={() => removeOption(i)}
              aria-label={t("setup.triviaOptionRemove")}
            >
              {t("setup.triviaDeleteRow")}
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="setup-button setup-button--ghost setup-button--compact"
        onClick={addOption}
        disabled={options.length >= 12}
      >
        + {t("setup.triviaAddOption")}
      </button>
    </div>
  );
}
