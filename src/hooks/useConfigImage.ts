import { useEffect, useState } from "react";

/**
 * Resuelve el valor de una imagen de configuración de la invitación.
 * Si `fieldValue` es una referencia `__cfgimg:xxx` se descifra y descarga
 * bajo demanda; si es un data URI (configs antiguas) se devuelve tal cual.
 * image-store se importa bajo demanda para no arrastrarlo al bundle inicial.
 */
export function useConfigImage(
  inviteToken: string | undefined,
  fieldValue: string | undefined | null,
): string | undefined {
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { getConfigImage, isConfigImageRef } = await import("../lib/image-store");

      if (!fieldValue) {
        setDataUrl(undefined);
        return;
      }
      if (!isConfigImageRef(fieldValue)) {
        setDataUrl(fieldValue);
        return;
      }
      if (!inviteToken) {
        return;
      }
      const imageId = fieldValue.slice("__cfgimg:".length);

      getConfigImage(inviteToken, imageId)
        .then((url) => {
          if (!cancelled) {
            setDataUrl(url || undefined);
          }
        })
        .catch((err) => {
          console.error("[app]", "[useConfigImage]", "resolve error", { imageId, error: err });
        });
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken, fieldValue]);

  return dataUrl;
}
