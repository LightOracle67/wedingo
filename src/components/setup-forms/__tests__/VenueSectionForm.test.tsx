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

// La sección del recinto consulta Firestore (subcolecciones sections y
// tables de la invitación) SOLO para mostrar el contador informativo de la
// pestaña Distribución. Se mockea collection/getDocs para simular los conteos
// reales y validar que el componente degrada sin crash si la lectura falla.
const mockGetDocs = vi.hoisted(() => vi.fn());
vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) =>
    args.join("/").includes("/tables")
      ? `tables-col:${String(args[args.length - 2])}`
      : "sections-col",
  getDocs: mockGetDocs,
}));
vi.mock("../../../lib/firebase", () => ({ db: {} }));

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
    // Token fijo de invitación de pruebas para que la consulta de secciones
    // y mesas del contador tenga una ruta determinista en los mocks.
    useConfig: () => ({ inviteToken: "tok1" }),
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
    // Estado por defecto: 2 secciones (s1 con 3 mesas, s2 con 1) que el
    // contador informativo debe mostrar como 2 secciones · 4 mesas.
    mockGetDocs.mockReset();
    mockGetDocs.mockImplementation((ref: unknown) => {
      const r = String(ref);
      if (r === "sections-col") return Promise.resolve({ docs: [{ id: "s1" }, { id: "s2" }] });
      if (r === "tables-col:s1") return Promise.resolve({ docs: [{ id: "t1" }, { id: "t2" }, { id: "t3" }] });
      if (r === "tables-col:s2") return Promise.resolve({ docs: [{ id: "t4" }] });
      return Promise.resolve({ docs: [] });
    });
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

  it("deshabilita el toggle del mapa cuando la sección venuemap está oculta", () => {
    storeBox.current = createFormStore({ hiddenSections: "venuemap" });
    renderWithStore(storeBox.current!);
    expect((screen.getByRole("checkbox", { name: "setup.venueMapLabel" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("checkbox", { name: "setup.tablesLabel" }) as HTMLInputElement).disabled).toBe(false);
  });

  it("deshabilita el toggle de mesas cuando la sección tables está oculta", () => {
    storeBox.current = createFormStore({ hiddenSections: "transport,tables" });
    renderWithStore(storeBox.current!);
    expect((screen.getByRole("checkbox", { name: "setup.tablesLabel" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("checkbox", { name: "setup.venueMapLabel" }) as HTMLInputElement).disabled).toBe(false);
  });

  it("no deshabilita los toggles si la sección oculta no es del recinto", () => {
    storeBox.current = createFormStore({ hiddenSections: "story,info" });
    renderWithStore(storeBox.current!);
    expect((screen.getByRole("checkbox", { name: "setup.venueMapLabel" }) as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole("checkbox", { name: "setup.tablesLabel" }) as HTMLInputElement).disabled).toBe(false);
  });

  it("muestra el toggle deshabilitado y el hint cuando la sección está oculta", () => {
    storeBox.current = createFormStore({ hiddenSections: "venuemap" });
    renderWithStore(storeBox.current!);
    const mapToggle = screen.getByRole("checkbox", { name: "setup.venueMapLabel" }) as HTMLInputElement;
    expect(mapToggle.disabled).toBe(true);
    expect(screen.getByText("setup.hiddenSectionToggleHint")).toBeTruthy();
    // El gate real del "no cambia al pulsar" es el atributo disabled (el
    // navegador ignora todo click en un control deshabilitado). jsdom con
    // fireEvent sigue disparando los handlers incluso en controles
    // deshabilitados, así que no se puede asertar el estado post-click aquí.
    expect(mapToggle.checked).toBe(false);
  });

  it("muestra el contador de secciones y mesas de la pestaña Distribución", async () => {
    renderWithStore(storeBox.current!);
    // El contador informativo consulta las subcolecciones reales (2 secciones,
    // s1 con 3 mesas y s2 con 1) y lo anuncia como estado accesible.
    const status = await screen.findByText("setup.venueTablesInfo");
    expect(status.getAttribute("role")).toBe("status");
    expect(screen.queryByText("setup.venueNoTablesHint")).toBeNull();
  });

  it("muestra el aviso cuando aún no hay mesas creadas", async () => {
    mockGetDocs.mockImplementation(() => Promise.resolve({ docs: [] }));
    renderWithStore(storeBox.current!);
    expect(await screen.findByText("setup.venueNoTablesHint")).toBeTruthy();
    expect(screen.queryByText("setup.venueTablesInfo")).toBeNull();
  });

  it("no rompe el formulario si la lectura del contador falla", async () => {
    mockGetDocs.mockRejectedValueOnce(new Error("boom"));
    renderWithStore(storeBox.current!);
    // El fallo degrada al aviso (0 secciones · 0 mesas): nunca debe bloquear
    // los toggles, que son quien decide la visibilidad pública real.
    expect(await screen.findByText("setup.venueNoTablesHint")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "setup.venueMapLabel" })).toBeTruthy();
  });
});
