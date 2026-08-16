import { describe, it, expect } from "vitest";
import { validateFile } from "../upload-validation";

const IMG = "image/png";
const BIG = 21 * 1024 * 1024;

function file(opts: { size?: number; type?: string; name?: string }) {
  return new File([new Uint8Array(opts.size ?? 10)], opts.name ?? "f.png", { type: opts.type ?? IMG });
}

describe("validateFile", () => {
  it("acepta un archivo válido", () => {
    expect(validateFile(file({ size: 1024 })).ok).toBe(true);
  });

  it("rechaza archivos vacíos", () => {
    expect(validateFile(file({ size: 0 }))).toEqual({ ok: false, errorKey: "setup.errorEmptyFile" });
  });

  it("rechaza tipos no permitidos", () => {
    const result = validateFile(file({ type: "text/html" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe("setup.errorFileFormat");
  });

  it("no valida el tipo si validateType es false (sello SVG)", () => {
    expect(validateFile(file({ type: "image/svg+xml" }), { validateType: false }).ok).toBe(true);
  });

  it("rechaza tamaños por encima del máximo", () => {
    const result = validateFile(file({ size: BIG }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe("setup.errorFileSize");
  });

  it("respeta maxBytes y claves de error personalizadas (audio)", () => {
    const typeErr = validateFile(file({ type: "video/mp4" }), {
      allowedTypes: new Set(["audio/mpeg"]),
      errorTypeKey: "setup.audioFormatError",
    });
    expect(typeErr).toEqual({ ok: false, errorKey: "setup.audioFormatError" });

    const sizeErr = validateFile(file({ size: BIG }), {
      maxBytes: 1024,
      errorSizeKey: "setup.audioSizeError",
    });
    expect(sizeErr).toEqual({ ok: false, errorKey: "setup.audioSizeError" });
  });
});
