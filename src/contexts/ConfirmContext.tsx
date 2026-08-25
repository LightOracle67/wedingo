/**
 * ConfirmContext — Modal global de confirmación y prompt (accesible).
 *
 * Reemplaza `window.confirm` / `window.prompt` (inaccesibles, no estilizables,
 * bloqueantes) en los paneles por un Modal compartido con focus-trap, Escape
 * y estados de carga. El proveedor vive en la raíz de la app; cualquier
 * componente puede llamar `useConfirm()` y usar `confirm()`/`prompt()` como
 * promesas, sin gestionar estado de modal por componente.
 */

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../components/Modal";
/** Opciones de una confirmación simple. */
export interface ConfirmOptions {
  /** Título del modal; si no se provee usa "Confirmar" (common.confirm). */
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Marca la acción como destructiva (estilo de advertencia). */
  danger?: boolean;
  /** Si se provee, el botón confirmar queda deshabilitado hasta escribir este
   *  texto exacto (protección extra para borrados masivos). */
  requireText?: string;
}

/** Opciones de un prompt con entrada de texto. */
export interface PromptOptions {
  title: string;
  message: string;
  /** Etiqueta del input (aria-label). */
  inputLabel: string;
  placeholder?: string;
  initial?: string;
}

type ResolveValue = string | boolean | null;

interface ResolverState {
  kind: "confirm" | "prompt";
  options: ConfirmOptions | PromptOptions;
}

interface ConfirmContextValue {
  /** Muestra una confirmación; resuelve `true` si se confirma. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Muestra un prompt con input; resuelve el valor introducido o `null`. */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * useConfirm — Confirmaciones/prompts accesibles.
 *
 * En producción el `ConfirmProvider` (raíz de la app) muestra un Modal
 * accesible. Si NO hay provider (p. ej. en tests unitarios que renderizan un
 * componente aislado), se degrada a `window.confirm`/`window.prompt`: así los
 * tests existentes que simulan el diálogo nativo siguen funcionando y la app
 * real nunca usa los diálogos nativos (inaccesibles). Las funciones del
 * fallback son estables (useCallback) para poder incluirlas en deps.
 */
export function useConfirm(): ConfirmContextValue {
  // Fallbacks estables (rules-of-hooks: se llaman SIEMPRE, antes del early
  // return del provider).
  const confirmFallback = useCallback(
    async (options: ConfirmOptions) => window.confirm(options.message),
    [],
  );
  const promptFallback = useCallback(
    async (options: PromptOptions) => window.prompt(options.message, options.initial ?? ""),
    [],
  );
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx;
  return { confirm: confirmFallback, prompt: promptFallback };
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = useState<ResolverState | null>(null);
  const [inputValue, setInputValue] = useState("");
  // Ref al resolver de la promesa pendiente (el modal resuelve al cerrarse).
  const resolverRef = useRef<((value: ResolveValue) => void) | null>(null);

  const open = useCallback((kind: "confirm" | "prompt", options: ConfirmOptions | PromptOptions) => {
    return new Promise<ResolveValue>((resolve) => {
      resolverRef.current = resolve;
      setInputValue(kind === "prompt" ? ((options as PromptOptions).initial ?? "") : "");
      setState({ kind, options });
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => open("confirm", options) as Promise<boolean>, [open]);

  const prompt = useCallback((options: PromptOptions) => open("prompt", options) as Promise<string | null>, [open]);

  const close = useCallback((value: ResolveValue) => {
    const resolve = resolverRef.current;
    setState(null);
    resolverRef.current = null;
    if (resolve) resolve(value);
  }, []);

  const isPrompt = state?.kind === "prompt";
  const confirmOpts = state && !isPrompt ? (state.options as ConfirmOptions) : null;
  const promptOpts = state && isPrompt ? (state.options as PromptOptions) : null;

  // Una confirmación con requireText exige escribir ese texto exacto.
  const requireOk =
    confirmOpts?.requireText != null && inputValue.trim() === confirmOpts.requireText.trim();
  const canConfirm = confirmOpts ? !confirmOpts.requireText || requireOk : inputValue.trim().length > 0;

  const title = isPrompt && promptOpts ? promptOpts.title : confirmOpts?.title ?? t("common.confirm");

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {state ? (
        <Modal title={title} closeLabel={t("common.close")} onClose={() => close(null)} hideTitle>
          <div className="confirm-modal">
            <p className="confirm-modal__title">{title}</p>
            <p className="confirm-modal__message">
              {isPrompt && promptOpts ? promptOpts.message : confirmOpts?.message ?? ""}
            </p>

            {isPrompt && promptOpts ? (
              <>
                <label className="setup-label" htmlFor="confirm-modal-input">
                  {promptOpts.inputLabel}
                </label>
                <input
                  id="confirm-modal-input"
                  className="setup-input"
                  type="text"
                  value={inputValue}
                  placeholder={promptOpts.placeholder}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                />
              </>
            ) : null}

            {confirmOpts?.requireText != null ? (
              <>
                <p className="confirm-modal__require-text">{t("common.requireText", { text: confirmOpts.requireText })}</p>
                {/* Input de verificación del texto exigido: sin él `canConfirm`
                    sería falso para siempre (no hay dónde escribir) y acciones
                    destructivas con requireText quedarían bloqueadas — bug real
                    detectado en DataTab (borrado total inaccesible). El
                    aria-label reutiliza el propio hint para accesibilidad. */}
                <input
                  id="confirm-modal-input"
                  className="setup-input"
                  type="text"
                  value={inputValue}
                  aria-label={t("common.requireText", { text: confirmOpts.requireText })}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                />
              </>
            ) : null}

            <div className="confirm-modal__actions">
              <button type="button" className="setup-button setup-button--ghost" onClick={() => close(false)}>
                {isPrompt ? t("common.cancel") : confirmOpts?.cancelLabel ?? t("common.cancel")}
              </button>
              <button
                type="button"
                className={`setup-button ${confirmOpts?.danger ? "setup-button--danger" : ""}`}
                onClick={() => close(isPrompt ? inputValue : true)}
                disabled={!canConfirm}
              >
                {isPrompt ? t("common.confirm") : confirmOpts?.confirmLabel ?? t("common.confirm")}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </ConfirmContext.Provider>
  );
}
