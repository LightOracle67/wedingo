/**
 * upload-validation.ts — Validación unificada de archivos de subida
 * (imágenes de config, galería y audio del editor).
 *
 * Centraliza los chequeos de archivo vacío, tipo permitido y tamaño máximo
 * que antes se duplicaban en CoverSectionForm, GalleryArrayEditor y
 * MusicArrayEditor con mensajes consistentes (toasts).
 */

import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "./constants";

/** Resultado de la validación: ok, o clave i18n del error a mostrar. */
type FileValidationResult = { ok: true } | { ok: false; errorKey: string };

interface ValidateFileOptions {
  /** Tipos MIME permitidos (por defecto los de imágenes de configuración). */
  allowedTypes?: ReadonlySet<string>;
  /** Valida el tipo MIME (por defecto true; el sello acepta SVG y no valida). */
  validateType?: boolean;
  /** Tamaño máximo en bytes (por defecto MAX_UPLOAD_SIZE_BYTES). */
  maxBytes?: number;
  /** Clave i18n del error de formato (por defecto "setup.errorFileFormat"). */
  errorTypeKey?: string;
  /** Clave i18n del error de tamaño (por defecto "setup.errorFileSize"). */
  errorSizeKey?: string;
}

/**
 * Valida un archivo antes de subirlo: vacío, tipo y tamaño. Devuelve
 * `{ ok: true }` o `{ ok: false, errorKey }` con la clave i18n del error
 * (`setup.errorEmptyFile` + `errorTypeKey`/`errorSizeKey` personalizables).
 */
export function validateFile(file: File, options: ValidateFileOptions = {}): FileValidationResult {
  if (file.size === 0) {
    return { ok: false, errorKey: "setup.errorEmptyFile" };
  }
  const validateType = options.validateType ?? true;
  const allowed = options.allowedTypes ?? ALLOWED_UPLOAD_TYPES;
  if (validateType && !allowed.has(file.type)) {
    return { ok: false, errorKey: options.errorTypeKey ?? "setup.errorFileFormat" };
  }
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_SIZE_BYTES;
  if (file.size > maxBytes) {
    return { ok: false, errorKey: options.errorSizeKey ?? "setup.errorFileSize" };
  }
  return { ok: true };
}
