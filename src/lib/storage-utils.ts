import { INVITE_CACHE_PREFIX } from "./storage-keys";

export function clearExpiredCache(): number {
  let cleared = 0;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(INVITE_CACHE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.cachedAt && Date.now() - parsed.cachedAt > 300000) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    cleared = keysToRemove.length;
  } catch {}

  return cleared;
}
