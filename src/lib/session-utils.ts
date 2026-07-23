import { clearSession, saveSession, getSession, renewSession, firestoreSessionExpiry } from "./sessionVars";

export interface SessionData {
  type: string;
  identifier: string;
  createdAt?: number;
  expiresAt?: number;
}

export function createAdminSession(username: string, inviteToken: string): void {
  saveSession("admin", username);
}

export function createSetupSession(inviteToken: string): void {
  saveSession("setup", inviteToken);
}

export function getActiveSession(): SessionData | null {
  return getSession();
}

export function renewActiveSession(): void {
  renewSession();
}

export { firestoreSessionExpiry, clearSession };
