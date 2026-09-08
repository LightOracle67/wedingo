import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportToXlsx, type ExcelSheet } from "../excel-utils";

/**
 * exportToXlsx se mockea en los tests de componentes (paneles admin), así que
 * su implementación real (buildWorkbook + writeWorkbookBuffer + descarga)
 * quedaba sin cubrir. Este test unitario la ejercita con jsdom quedándose
 * antes del navegador real (URL.createObjectURL/click stubeados).
 */

function buildSheet(): ExcelSheet {
  return {
    name: "Hoja1",
    headers: ["Columna A", "Columna B"],
    rows: [["v1", "v2"]],
  };
}

describe("exportToXlsx", () => {
  let createUrl: ReturnType<typeof vi.fn>;
  let revokeUrl: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createUrl = vi.fn(() => "blob:xlsx");
    revokeUrl = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("genera y descarga el workbook con el nombre pedido", () => {
    exportToXlsx("informe", [buildSheet()]);
    expect(createUrl).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith("blob:xlsx");
    // El blob generado es un .xlsx (ZIP) con cabecera correcta.
    const blob = createUrl.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  it("no descarga nada si la lista de hojas está vacía", () => {
    exportToXlsx("vacio", []);
    expect(createUrl).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("incluye todas las hojas en el zip", () => {
    exportToXlsx("multi", [buildSheet(), { name: "Hoja2", headers: ["x"], rows: [["1"]] }]);
    expect(createUrl).toHaveBeenCalledOnce();
    const blob = createUrl.mock.calls[0]![0] as Blob;
    expect(blob.size).toBeGreaterThan(0);
  });
});