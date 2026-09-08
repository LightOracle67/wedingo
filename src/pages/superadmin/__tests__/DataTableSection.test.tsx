import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { TFunction } from "i18next";
import { DataTableSection, type PiiResult } from "../DataTableSection";
import type { InvitationData } from "../data-tab-helpers";

// t identity: los tests interactúan con las claves i18n directamente.
const stableT: TFunction = ((key: string) => key) as unknown as TFunction;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT }),
}));

/** Invitación mínima válida para la tabla. */
function makeInv(id: string, firstName = "Ana"): InvitationData {
  return {
    id,
    firstName,
    secondName: "López",
    adminUsername: "admin",
    rsvpCount: 0,
    tokenCount: 0,
    weddingDate: "2030-01-01",
    hasSession: false,
    visits: 0,
    lastActivity: "",
    createdAt: "",
  };
}

interface SectionArgs {
  invitations?: InvitationData[];
  selected?: Set<string>;
  emptyIds?: Set<string>;
  piiResults?: PiiResult[];
  confirmText?: string;
  bulkThemeBusy?: boolean;
  singleSelected?: string;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onActivityFilterChange?: (v: string) => void;
  onApplyBulkTheme?: () => void;
  onSearchPii?: () => void;
  onOpenDetail?: (token: string) => void;
  onSelectEmpty?: () => void;
  onExportAll?: () => void;
  onExportRange?: () => void;
  onExportSelected?: () => void;
  onPrintSelected?: () => void;
  onExcelSelected?: () => void;
  onMenusSelected?: () => void;
  onBulkExpiry?: () => void;
  onBulkSeal?: () => void;
  onDeleteSelected?: () => void;
  onDeleteAll?: () => void;
  onPurgeOld?: () => void;
  onConfirmTextChange?: (v: string) => void;
}

/** Renderiza el componente con props por defecto + overrides. */
function renderSection(args: SectionArgs = {}) {
  const invitations = args.invitations ?? [];
  // Callbacks por defecto como spies: los tests los asertan aunque no se
  // pasen overrides (vi.clearAllMocks en beforeEach).
  const onSelectAll = args.onSelectAll ?? vi.fn();
  const onDeselectAll = args.onDeselectAll ?? vi.fn();
  const onActivityFilterChange = args.onActivityFilterChange ?? vi.fn();
  const onApplyBulkTheme = args.onApplyBulkTheme ?? vi.fn();
  const onSearchPii = args.onSearchPii ?? vi.fn();
  const onOpenDetail = args.onOpenDetail ?? vi.fn();
  const onSelectEmpty = args.onSelectEmpty ?? vi.fn();
  const onExportAll = args.onExportAll ?? vi.fn();
  const onExportRange = args.onExportRange ?? vi.fn();
  const onExportSelected = args.onExportSelected ?? vi.fn();
  const onPrintSelected = args.onPrintSelected ?? vi.fn();
  const onExcelSelected = args.onExcelSelected ?? vi.fn();
  const onMenusSelected = args.onMenusSelected ?? vi.fn();
  const onBulkExpiry = args.onBulkExpiry ?? vi.fn();
  const onBulkSeal = args.onBulkSeal ?? vi.fn();
  const onDeleteSelected = args.onDeleteSelected ?? vi.fn();
  const onDeleteAll = args.onDeleteAll ?? vi.fn();
  const onPurgeOld = args.onPurgeOld ?? vi.fn();
  const onConfirmTextChange = args.onConfirmTextChange ?? vi.fn();
  render(
    <DataTableSection
      invitations={invitations}
      filtered={invitations}
      sortedInvitations={invitations}
      selected={args.selected ?? new Set()}
      selectedCount={(args.selected ?? new Set()).size}
      totalCount={invitations.length}
      emptyIds={args.emptyIds ?? new Set()}
      isEmptyCount={(args.emptyIds ?? new Set()).size}
      singleSelected={args.singleSelected ?? (args.selected?.size === 1 ? [...args.selected][0] ?? "" : "")}
      busy={false}
      activityFilter="todas"
      onActivityFilterChange={onActivityFilterChange}
      confirmText={args.confirmText ?? ""}
      onConfirmTextChange={onConfirmTextChange}
      piiQuery=""
      onPiiQueryChange={() => {}}
      piiResults={args.piiResults ?? []}
      onSearchPii={onSearchPii}
      bulkTheme="golden"
      onBulkThemeChange={() => {}}
      onApplyBulkTheme={onApplyBulkTheme}
      bulkThemeBusy={args.bulkThemeBusy ?? false}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      onSelectEmpty={onSelectEmpty}
      onExportAll={onExportAll}
      onExportRange={onExportRange}
      onOpenDetail={onOpenDetail}
      onExportSelected={onExportSelected}
      onPrintSelected={onPrintSelected}
      onExcelSelected={onExcelSelected}
      onMenusSelected={onMenusSelected}
      onBulkExpiry={onBulkExpiry}
      onBulkSeal={onBulkSeal}
      onDeleteSelected={onDeleteSelected}
      onDeleteAll={onDeleteAll}
      onPurgeOld={onPurgeOld}
      onToggleSelect={() => {}}
      onCopyToken={() => {}}
      onToggleSort={() => {}}
      getIndicator={() => "default"}
      t={stableT}
    />,
  );
  return {
    onSelectAll,
    onDeselectAll,
    onActivityFilterChange,
    onApplyBulkTheme,
    onSearchPii,
    onOpenDetail,
    onSelectEmpty,
    onExportAll,
    onExportRange,
    onExportSelected,
    onPrintSelected,
    onExcelSelected,
    onMenusSelected,
    onBulkExpiry,
    onBulkSeal,
    onDeleteSelected,
    onDeleteAll,
    onPurgeOld,
    onConfirmTextChange,
    onToggleSelect: vi.fn(),
  };
}

describe("DataTableSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza las filas de invitaciones recibidas", () => {
    renderSection({ invitations: [makeInv("abc123"), makeInv("def456", "Luis")] });
    // Las filas exponen el token en la columna correspondiente.
    expect(screen.getByText("abc123")).toBeDefined();
    expect(screen.getByText("def456")).toBeDefined();
  });

  it("muestra el mensaje vacío cuando no hay invitaciones", () => {
    renderSection();
    expect(screen.getByText("superadmin.data.noInvitations")).toBeDefined();
  });

  it("selecciona/deselecciona todo desde el checkbox de cabecera", () => {
    const invitations = [makeInv("a"), makeInv("b")];
    // 1) Con ninguna seleccionada, el clic selecciona todo.
    let h = renderSection({ invitations });
    const headerBox = screen.getByLabelText("superadmin.data.selectAll") as HTMLInputElement;
    expect(headerBox.checked).toBe(false);
    fireEvent.click(headerBox);
    expect(h.onSelectAll).toHaveBeenCalledTimes(1);

    // 2) Con TODO seleccionado, el clic deselecciona. Se limpia el DOM entre
    // renders (sin auto-cleanup, dos renders convivirían en el body).
    cleanup();
    h = renderSection({ invitations, selected: new Set(["a", "b"]) });
    const headerBox2 = screen.getByLabelText("superadmin.data.selectAll") as HTMLInputElement;
    expect(headerBox2.checked).toBe(true);
    fireEvent.click(headerBox2);
    expect(h.onDeselectAll).toHaveBeenCalledTimes(1);
  });

  it("cambia el filtro de actividad", () => {
    const h = renderSection();
    fireEvent.change(screen.getByLabelText("superadmin.data.activityFilter"), { target: { value: "semana" } });
    expect(h.onActivityFilterChange).toHaveBeenCalledWith("semana");
  });

  it("ejecuta la búsqueda PII y pinta resultados", () => {
    const piiResults: PiiResult[] = [{ token: "tok1", name: "Ana García", attendance: "yes" }];
    const h = renderSection({ piiResults });
    fireEvent.keyDown(screen.getByLabelText("superadmin.data.piiPlaceholder"), { key: "Enter" });
    expect(h.onSearchPii).toHaveBeenCalled();
    expect(screen.getByText(/Ana García/)).toBeDefined();
    expect(screen.getByText("tok1")).toBeDefined();
  });

  it("aplica el tema en bloque desde el selector", () => {
    // El botón solo está activo con selección no vacía.
    const h = renderSection({ selected: new Set(["abc123"]) });
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.bulkTheme/ }));
    expect(h.onApplyBulkTheme).toHaveBeenCalledTimes(1);
  });

  it("exporta todo y por rango desde la barra de acciones", () => {
    const h = renderSection({ invitations: [makeInv("a")] });
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.exportAllBtn/ }));
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.rangeBtn/ }));
    expect(h.onExportAll).toHaveBeenCalledTimes(1);
    expect(h.onExportRange).toHaveBeenCalledTimes(1);
  });

  it("con UNA selección muestra detalle, enlace admin y exporta/print/excel/menús/expiración/sello", () => {
    const h = renderSection({ invitations: [makeInv("abc123")], selected: new Set(["abc123"]) });
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.detailBtn/ }));
    expect(h.onOpenDetail).toHaveBeenCalledWith("abc123");
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.exportSelectedBtn/ }));
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.printBtn/ }));
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.excelBtn/ }));
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.menusBtn/ }));
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.bulkExpiryBtn/ }));
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.bulkSealBtn/ }));
    expect(h.onExportSelected).toHaveBeenCalled();
    expect(h.onPrintSelected).toHaveBeenCalled();
    expect(h.onExcelSelected).toHaveBeenCalled();
    expect(h.onMenusSelected).toHaveBeenCalled();
    expect(h.onBulkExpiry).toHaveBeenCalled();
    expect(h.onBulkSeal).toHaveBeenCalled();
    // El enlace al admin lleva a la invitación seleccionada (target _blank).
    const link = screen.getByText("superadmin.data.adminLink");
    expect(link.getAttribute("href")).toBe("/abc123/admin");
  });

  it("borrar en lote exige la palabra de confirmación y la purga muestra el modal", () => {
    const h = renderSection({ invitations: [makeInv("a")], selected: new Set(["a"]) });
    const del = screen.getByRole("button", { name: /superadmin\.data\.deleteSelectedBtn/ }) as HTMLButtonElement;
    expect(del.disabled).toBe(true);
    // Se escribe la palabra y el botón se habilita y dispara.
    const input = screen.getByLabelText("superadmin.data.confirmInputLabel");
    fireEvent.change(input, { target: { value: "ELIMINAR" } });
    expect(h.onConfirmTextChange).toHaveBeenCalledWith("ELIMINAR");
    cleanup();
    const h2 = renderSection({
      invitations: [makeInv("a")],
      selected: new Set(["a"]),
      confirmText: "ELIMINAR",
    });
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.deleteSelectedBtn/ }));
    expect(h2.onDeleteSelected).toHaveBeenCalled();
    fireEvent.click(screen.getByText("superadmin.data.purgeBtn"));
    expect(h2.onPurgeOld).toHaveBeenCalled();
    // Borrar todo también exige la palabra.
    fireEvent.click(screen.getAllByText("superadmin.data.deleteAllBtn")[0]!);
    expect(h2.onDeleteAll).toHaveBeenCalled();
  });

  it("selecciona solo las invitaciones vacías cuando las hay", () => {
    const h = renderSection({ invitations: [makeInv("a"), makeInv("b")], emptyIds: new Set(["b"]) });
    fireEvent.click(screen.getByRole("button", { name: /superadmin\.data\.selectEmpty/ }));
    expect(h.onSelectEmpty).toHaveBeenCalled();
  });

  it("bloquea el tema en bloque sin selección y con bulkThemeBusy", () => {
    renderSection();
    expect((screen.getByRole("button", { name: /superadmin\.data\.bulkTheme/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    renderSection({ selected: new Set(["a"]), bulkThemeBusy: true });
    expect((screen.getByRole("button", { name: /superadmin\.data\.bulkTheme/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});