const STORAGE_PREFIX = "wedin_";

export function getStorageUsage(): { used: number; total: number; percent: number } {
  let used = 0;
  const total = 5 * 1024 * 1024; // 5MB estimate for localStorage

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) used += key.length + value.length;
      }
    }
  } catch {}

  return {
    used,
    total,
    percent: Math.round((used / total) * 100),
  };
}

export function clearExpiredCache(): number {
  let cleared = 0;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${STORAGE_PREFIX}invite_cache_`)) {
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
