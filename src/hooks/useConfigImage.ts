import { useEffect, useState } from "react";
import { getConfigImage, isConfigImageRef } from "../lib/image-store";

export function useConfigImage(inviteToken: string | undefined, fieldValue: string | undefined | null): string | undefined {
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!fieldValue) { setDataUrl(undefined); return; }
    if (!isConfigImageRef(fieldValue)) { setDataUrl(fieldValue); return; }
    if (!inviteToken) return;
    const imageId = fieldValue.slice("__cfgimg:".length);
    let cancelled = false;
    getConfigImage(inviteToken, imageId).then((url) => {
      if (!cancelled) setDataUrl(url || undefined);
    });
    return () => { cancelled = true; };
  }, [inviteToken, fieldValue]);

  return dataUrl;
}
