/**
 * ConfigImageField — Bloque de subida de imagen de configuración (portada,
 * sello, fondo, esquinas).
 *
 * Centraliza el patrón `.setup-background-panel` que se repetía 4× en
 * CoverSectionForm: vista previa + botón quitar (o label de subida con estado
 * "Subiendo...") + input de archivo oculto y accesible por teclado. Las
 * variantes se cubren con props (estilo de vista previa, título, label de
 * reemplazo, encabezado con label propio para las esquinas).
 */

import { memo, type CSSProperties } from "react";

interface ConfigImageFieldProps {
  /** Id del campo (prefijo + nombre) — también id del input de archivo. */
  id: string;
  /** Valor crudo del campo (referencia __cfgimg: o URL): si no está vacío se
   *  muestra la vista previa en lugar del label de subida. */
  value: string;
  /** src seguro resuelto (imagen descifrada o URL cruda). */
  src: string;
  /** Texto alternativo de la imagen de la vista previa. */
  alt?: string;
  /** Estilo de la imagen de la vista previa (redonda, contain, cover...). */
  previewStyle?: CSSProperties;
  /** Título bajo la vista previa (p. ej. "Foto actual"); si se omite y no hay
   *  headerLabel, el botón quitar va junto a la imagen. */
  currentLabel?: string;
  /** Texto del label de subida cuando no hay imagen. */
  uploadLabel: string;
  /** Texto del hint del label de subida. */
  uploadHint: string;
  /** Texto del label "Reemplazar" cuando ya hay imagen (portada). */
  replaceLabel?: string;
  /** Tipos MIME aceptados (atributo accept del input). */
  accept: string;
  /** ¿Está subiendo esta imagen? (deshabilita y muestra "Subiendo..."). */
  uploading: boolean;
  /** Texto "Subiendo...". */
  uploadingLabel: string;
  /** Texto del botón "Quitar". */
  removeLabel: string;
  /** Encabezado con label propio y botón quitar (esquinas). */
  headerLabel?: string;
  /** Maneja la selección del archivo (recibe el File, no el evento). */
  onUpload: (file: File) => void;
  /** Quita la imagen (borra la subcolección y limpia el campo). */
  onRemove: () => void;
  /** Estilo del contenedor del panel. */
  style?: CSSProperties;
}

const ConfigImageField = memo(function ConfigImageField({
  id,
  value,
  src,
  alt,
  previewStyle,
  currentLabel,
  uploadLabel,
  uploadHint,
  replaceLabel,
  accept,
  uploading,
  uploadingLabel,
  removeLabel,
  headerLabel,
  onUpload,
  onRemove,
  style,
}: ConfigImageFieldProps) {
  const hasImage = Boolean(value);
  const uploadClassName = uploading ? "setup-upload setup-upload--busy" : "setup-upload";
  return (
    <div className="setup-background-panel" style={style}>
      {headerLabel ? (
        <div className="setup-background-panel__header">
          <span className="setup-label setup-label--tight" style={{ fontSize: "0.8rem" }}>
            {headerLabel}
          </span>
          {hasImage ? (
            <button
              className="setup-button setup-button--ghost setup-button--compact"
              type="button"
              onClick={onRemove}
              style={{ fontSize: "0.7rem" }}
            >
              {removeLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {hasImage ? (
        <div className="setup-selected-background">
          <img src={src} alt={alt ?? ""} className="setup-selected-background__image" style={previewStyle} />
          {currentLabel ? (
            <div>
              <p className="setup-selected-background__title">{currentLabel}</p>
              <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={onRemove}>
                {removeLabel}
              </button>
            </div>
          ) : headerLabel ? null : (
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={onRemove}>
              {removeLabel}
            </button>
          )}
        </div>
      ) : (
        <label className={uploadClassName} htmlFor={id} aria-disabled={uploading || undefined}>
          <span className="setup-upload__title">{uploading ? uploadingLabel : uploadLabel}</span>
          <span className="setup-upload__subtitle">{uploadHint}</span>
        </label>
      )}

      <input
        className="setup-upload__input"
        id={id}
        type="file"
        accept={accept}
        disabled={uploading}
        onChange={(e) => {
          // Captura el File y limpia el input ANTES de llamar al handler (el
          // input no debe conservar el archivo seleccionado tras el cambio).
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onUpload(file);
        }}
      />

      {hasImage && replaceLabel ? (
        <label className={uploadClassName} htmlFor={id} aria-disabled={uploading || undefined}>
          {uploading ? uploadingLabel : replaceLabel}
        </label>
      ) : null}
    </div>
  );
});

export default ConfigImageField;
