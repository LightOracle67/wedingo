/**
 * chrome-store.ts (rama firebase-lazy, v2.192 en preparación)
 * ─────────────────────────────────────────────────────────────
 * Micro-store (useSyncExternalStore) que comunica al SHELL global si debe
 * ocultar el chrome público (nav/footer) porque el invitado es, en realidad,
 * el ADMIN con sesión. Antes esa decisión se leía de useAuth() a nivel del
 * shell; con los providers ahora acotados a cada ruta, el shell solo ve un
 * booleano de módulo (sin contextos ni Firebase).
 */

const listeners = new Set<() => void>();
let footerVisible = true;
let adminMode = false;

function notify() {
  for (const cb of listeners) cb();
}

export function setFooterVisible(visible: boolean) {
  if (footerVisible === visible) return;
  footerVisible = visible;
  notify();
}

export function getFooterVisible(): boolean {
  return footerVisible;
}

export function setAdminMode(admin: boolean) {
  if (adminMode === admin) return;
  adminMode = admin;
  notify();
}

export function getAdminMode(): boolean {
  return adminMode;
}

export function subscribeFooterVisible(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
