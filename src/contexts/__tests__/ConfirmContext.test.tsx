/**
 * Tests del ConfirmContext: caracteriza el modal de confirmación/prompt
 * accesible, sus fallbacks nativos y el input de requireText.
 *
 * Cobertura objetivo: ramas de ConfirmProvider (requireText, danger, labels
 * custom, prompt con initial/placeholder, cierre por onClose) y el camino de
 * fallback de useConfirm (window.confirm/window.prompt).
 *
 * NOTA sobre queries: en tests aislados i18n no está inicializado y t()
 * devuelve claves crudas ('common.confirm'), así que los botones se
 * seleccionan por POSICIÓN dentro del diálogo (los dos últimos son siempre
 * Cancelar/Aceptar del bloque de acciones; el primero es la X del Modal).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { ConfirmProvider, useConfirm, type ConfirmOptions, type PromptOptions } from "../ConfirmContext";

/** Sonda: expone la API del contexto a los tests vía un botón. */
function Probe({
  onResult,
  mode,
  options,
}: {
  onResult: (value: unknown) => void;
  mode: "confirm" | "prompt";
  options: ConfirmOptions | PromptOptions;
}) {
  const { confirm, prompt } = useConfirm();
  return (
    <button
      type="button"
      onClick={async () => {
        // Lanza el diálogo elegido y reporta el valor resuelto (o el error).
        try {
          onResult(
            mode === "confirm" ? await confirm(options as ConfirmOptions) : await prompt(options as PromptOptions),
          );
        } catch (e) {
          onResult(`error:${String(e)}`);
        }
      }}
    >
      abrir
    </button>
  );
}

/** Devuelve [botónX, botónCancelar, botónOK] del diálogo abierto. */
function dialogButtons(): HTMLButtonElement[] {
  const dialog = screen.getByRole("dialog");
  return within(dialog).getAllByRole("button") as HTMLButtonElement[];
}

describe("ConfirmContext", () => {
  it("confirm simple resuelve true al aceptar y muestra message", async () => {
    const results: unknown[] = [];
    render(
      <ConfirmProvider>
        <Probe mode="confirm" onResult={(v) => results.push(v)} options={{ message: "¿Seguro?" }} />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    // El mensaje custom se pinta en el cuerpo del modal.
    expect(screen.getByText("¿Seguro?")).toBeInTheDocument();
    fireEvent.click(dialogButtons().at(-1)!);
    await waitFor(() => expect(results).toEqual([true]));
  });

  it("confirm cancela con false (botón) y null (X del Modal)", async () => {
    const results: unknown[] = [];
    render(
      <ConfirmProvider>
        <Probe mode="confirm" onResult={(v) => results.push(v)} options={{ message: "m1" }} />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    // Penúltimo = Cancelar → false.
    fireEvent.click(dialogButtons().at(-2)!);
    await waitFor(() => expect(results).toEqual([false]));
    // Reabrir y cerrar por la X del Modal (onClose → close(null)).
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    fireEvent.click(dialogButtons()[0]!);
    await waitFor(() => expect(results).toEqual([false, null]));
  });

  it("labels custom, danger y requireText bloquean hasta escribir el texto exacto", async () => {
    const results: unknown[] = [];
    render(
      <ConfirmProvider>
        <Probe
          mode="confirm"
          onResult={(v) => results.push(v)}
          options={{
            title: "Borrar todo",
            message: "acción destructiva",
            confirmLabel: "Sí, borrar",
            cancelLabel: "Conservar",
            danger: true,
            // Con espacios a propósito: la comparación recorta (trim).
            requireText: " BORRAR ",
          }}
        />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    expect(screen.getByText("Borrar todo")).toBeInTheDocument();
    expect(screen.getByText("acción destructiva")).toBeInTheDocument();
    // Botón peligro deshabilitado hasta que el texto recortado coincida exacto.
    const yes = dialogButtons().at(-1)!;
    expect(yes).toBeDisabled();
    expect(yes.className).toContain("setup-button--danger");
    // Input de requireText (fix del bug: antes no existía en modo confirm).
    const input = document.getElementById("confirm-modal-input") as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: "mal" } });
    expect(yes).toBeDisabled();
    fireEvent.change(input, { target: { value: "BORRAR" } });
    expect(yes).toBeEnabled();
    fireEvent.click(yes);
    await waitFor(() => expect(results).toEqual([true]));
  });

  it("prompt: initial precarga, placeholder, vacío deshabilita y devuelve el valor", async () => {
    const results: unknown[] = [];
    render(
      <ConfirmProvider>
        <Probe
          mode="prompt"
          onResult={(v) => results.push(v)}
          options={{
            title: "Renombrar",
            message: "nuevo nombre",
            inputLabel: "Nombre",
            placeholder: "p. ej. Salón",
            initial: "viejo",
          }}
        />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    expect(input.value).toBe("viejo");
    expect(input.placeholder).toBe("p. ej. Salón");
    // Vaciar deshabilita confirmar (canConfirm = trim().length > 0).
    fireEvent.change(input, { target: { value: "" } });
    expect(dialogButtons().at(-1)).toBeDisabled();
    fireEvent.change(input, { target: { value: "nuevo" } });
    fireEvent.click(dialogButtons().at(-1)!);
    await waitFor(() => expect(results).toEqual(["nuevo"]));
  });

  it("prompt cancelado con botón resuelve false (comportamiento actual fijado)", async () => {
    const results: unknown[] = [];
    render(
      <ConfirmProvider>
        <Probe mode="prompt" onResult={(v) => results.push(v)} options={{ message: "x" }} />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    // Caracterización: close(false) es compartido; solo la X resuelve null.
    fireEvent.click(dialogButtons().at(-2)!);
    await waitFor(() => expect(results).toEqual([false]));
  });

  it("useConfirm sin provider degrada a window.confirm/window.prompt", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("nativo");
    const results: unknown[] = [];
    // SIN ConfirmProvider a propósito: ejercita la rama de fallback.
    render(<Probe mode="confirm" onResult={(v) => results.push(v)} options={{ message: "nat1" }} />);
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    expect(confirmSpy).toHaveBeenCalledWith("nat1");
    render(<Probe mode="prompt" onResult={(v) => results.push(v)} options={{ message: "nat2", initial: "i" }} />);
    fireEvent.click(screen.getAllByRole("button", { name: "abrir" })[1]!);
    expect(promptSpy).toHaveBeenCalledWith("nat2", "i");
    await waitFor(() => expect(results).toEqual([true, "nativo"]));
  });
});
