import { useEffect, useState } from "react";
import { getConfigImage, isConfigImageRef } from "../lib/image-store";

export function useConfigImage(inviteToken: string | undefined, fieldValue: string | undefined | null): string | undefined {
  console.log("[app]", "[useConfigImage]", "hook mount", { hasInviteToken: !!inviteToken, hasFieldValue: !!fieldValue });
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    console.log("[app]", "[useConfigImage]", "effect", { fieldValue, isRef: isConfigImageRef(fieldValue || ""), inviteToken });
    if (!fieldValue) { console.log("[app]", "[useConfigImage]", "no fieldValue, clearing", {}); setDataUrl(undefined); return; }
    if (!isConfigImageRef(fieldValue)) { console.log("[app]", "[useConfigImage]", "not a ref, using as-is", {}); setDataUrl(fieldValue); return; }
    if (!inviteToken) { console.log("[app]", "[useConfigImage]", "no inviteToken, skip", {}); return; }
    const imageId = fieldValue.slice("__cfgimg:".length);
    console.log("[app]", "[useConfigImage]", "resolving config image", { imageId });
    let cancelled = false;
    getConfigImage(inviteToken, imageId).then((url) => {
      if (!cancelled) {
        console.log("[app]", "[useConfigImage]", "resolve result", { imageId, found: !!url });
        setDataUrl(url || undefined);
      }
    }).catch((err) => {
      console.error("[app]", "[useConfigImage]", "resolve error", { imageId, error: err });
    });
    return () => { cancelled = true; };
  }, [inviteToken, fieldValue]);

  return dataUrl;
}
