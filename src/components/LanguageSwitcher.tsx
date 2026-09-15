import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_GROUPS, resolveLanguageCode } from "../i18n/languages";
import "../styles/lang.css";

/** Opción "auto": vuelve a la detección automática del idioma del navegador. */
const AUTO = "__auto__";

const LanguageSwitcher = memo(function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const resolve = useCallback(() => {
    const lng = i18n.resolvedLanguage || i18n.language || "es";
    return resolveLanguageCode(lng);
  }, [i18n]);

  const [value, setValue] = useState<string>(resolve());

  useEffect(() => {
    // i18next v21+: `on` devuelve el emitter y para desuscribir se usa `off`.
    const handler = () => setValue(resolve());
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n]);

  // Mantener lang/dir del <html> sincronizados también aquí (respaldo por si
  // el listener global de i18n no estuviera activo).
  useEffect(() => {
    const lng = resolve();
    if (typeof document !== "undefined") {
      document.documentElement.lang = lng;
      document.documentElement.dir = (/^(ar|fa|he|ur)/.test(lng || "") ? "rtl" : "ltr");
    }
  }, [value, resolve]);

  const onChange = useCallback(
    (code: string) => {
      if (code === AUTO) {
        // Auto: limpiar el idioma cacheado y volver a la detección del navegador.
        try {
          localStorage.removeItem("i18nextLng");
        } catch {
          /* almacenamiento no disponible */
        }
        i18n.changeLanguage(undefined as unknown as string);
        setValue(resolve());
        if (typeof document !== "undefined") window.location.reload();
        return;
      }
      i18n.changeLanguage(code);
      setValue(code);
    },
    [i18n, resolve],
  );

  return (
    <div className="lang-wrapper" role="group" aria-label={t("lang.triggerLabel")}>
      <label className="lang-select">
        <select
          className="lang-select__control"
          aria-label={t("lang.triggerLabel")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value={AUTO}>{t("lang.auto")}</option>
          {LANGUAGE_GROUPS.map((group) => (
            <optgroup key={group.key} label={t(group.key)}>
              {group.languages.map((lang) => (
                <option key={lang.code} value={lang.code} lang={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );
});

export default LanguageSwitcher;