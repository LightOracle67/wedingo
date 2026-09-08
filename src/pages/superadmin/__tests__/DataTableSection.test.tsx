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
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onActivityFilterChange?: (v: string) => void;
  onApplyBulkTheme?: () => void;
  onSearchPii?: () => void;
  onOpenDetail?: (token: string) => void;
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
      singleSelected=""
      busy={false}
      activityFilter="todas"
      onActivityFilterChange={onActivityFilterChange}
      confirmText=""
      onConfirmTextChange={() => {}}
      piiQuery=""
      onPiiQueryChange={() => {}}
      piiResults={args.piiResults ?? []}
      onSearchPii={onSearchPii}
      bulkTheme="golden"
      onBulkThemeChange={() => {}}
      onApplyBulkTheme={onApplyBulkTheme}
      bulkThemeBusy={false}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      onSelectEmpty={() => {}}
      onExportAll={() => {}}
      onExportRange={() => {}}
      onOpenDetail={onOpenDetail}
      onExportSelected={() => {}}
      onPrintSelected={() => {}}
      onExcelSelected={() => {}}
      onMenusSelected={() => {}}
      onBulkExpiry={() => {}}
      onBulkSeal={() => {}}
      onDeleteSelected={() => {}}
      onDeleteAll={() => {}}
      onPurgeOld={() => {}}
      onToggleSelect={() => {}}
      onCopyToken={() => {}}
      onToggleSort={() => {}}
      getIndicator={() => "default"}
      t={stableT}
    />,
  );
  return { onSelectAll, onDeselectAll, onActivityFilterChange, onApplyBulkTheme, onSearchPii, onOpenDetail };
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
    fireEvent.click(screen.getByText("superadmin.data.bulkTheme"));
    expect(h.onApplyBulkTheme).toHaveBeenCalledTimes(1);
  });
});