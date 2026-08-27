import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createFormStore, FormStoreContext } from "../../../contexts/FormStore";

// Tienda REAL compartida entre el factory del mock y los tests: el
// updateFormField del mock escribe en ella (mismo contrato que el
// ConfigProvider) y el useFormField real (useSyncExternalStore) notifica al
// componente, que debe re-renderizarse al pulsar el toggle. Con el patrón
// antiguo (getField síncrono sin suscripción) el checkbox nunca cambiaba de
// estado visual: el test lo captura como RED.
const storeBox = vi.hoisted(() => ({ current: null as ReturnType<typeof createFormStore> | null }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts", async () => {
  const { useFormField, useFormStore } = await import("../../../contexts/FormStore");
  return {
    useConfigActions: () => ({
      updateFormField: (field: string, value: string) => storeBox.current?.set(field, value),
      handleDayChange: vi.fn(),
      handleTimeChange: vi.fn(),
      handleTimeBlur: vi.fn(),
      handleYearChange: vi.fn(),
      maxAllowedYear: 2099,
      inviteToken: "",
      hasStoredConfig: false,
    }),
    useFormField,
    useFormStore,
  };
});

import VenueSectionForm from "../VenueSectionForm";

// Renderiza el componente con el store real provisto en el contexto (el
// useFormField real lanza error si no hay provider ConfigProvider).
function renderWithStore(store: ReturnType<typeof createFormStore>) {
  return render(
    <FormStoreContext.Provider value={store}>
      <VenueSectionForm />
    </FormStoreContext.Provider>,
  );
}

describe("VenueSectionForm", () => {
  beforeEach(() => {
    storeBox.current = createFormStore({});
  });

  it("activa el toggle del mapa del recinto al pulsarlo (bug de re-render)", () => {
    renderWithStore(storeBox.current!);
    const mapToggle = screen.getByRole("checkbox", { name: "setup.venueMapLabel" }) as HTMLInputElement;
    expect(mapToggle.checked).toBe(false);
    // El click escribe en el store; el useFormField suscrito debe
    // re-renderizar el checkbox de nuevo a true (antes no ocurría).
    fireEvent.click(mapToggle);
    expect(mapToggle.checked).toBe(true);
    expect(storeBox.current?.getField("venueMapEnabled")).toBe("true");
  });

  it("desactiva y reactiva el toggle de mesas con dos pulsaciones", () => {
    renderWithStore(storeBox.current!);
    const tablesToggle = screen.getByRole("checkbox", { name: "setup.tablesLabel" }) as HTMLInputElement;
    fireEvent.click(tablesToggle);
    expect(tablesToggle.checked).toBe(true);
    expect(storeBox.current?.getField("tablesEnabled")).toBe("true");
    fireEvent.click(tablesToggle);
    expect(tablesToggle.checked).toBe(false);
    expect(storeBox.current?.getField("tablesEnabled")).toBe("false");
  });

  it("marca la fila como atenuada cuando su sección está desactivada", () => {
    renderWithStore(storeBox.current!);
    // Con el store vacío ambas filas arrancan apagadas (--off visible).
    const offRows = document.querySelectorAll(".setup-toggle-row--off");
    expect(offRows.length).toBe(2);
    // Al activar el mapa, su fila deja de estar atenuada.
    fireEvent.click(screen.getByRole("checkbox", { name: "setup.venueMapLabel" }));
    expect(document.querySelectorAll(".setup-toggle-row--off").length).toBe(1);
  });

  it("refleja el estado persistido en el arranque (que no esté vacío)", () => {
    // Con valores previos en la tienda el checkbox debe nacer activo.
    storeBox.current = createFormStore({ venueMapEnabled: "true" });
    renderWithStore(storeBox.current!);
    expect((screen.getByRole("checkbox", { name: "setup.venueMapLabel" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "setup.tablesLabel" }) as HTMLInputElement).checked).toBe(false);
  });
});
