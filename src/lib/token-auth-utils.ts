import { generateSetupToken, normalizeTokenValue } from "./token-utils";

export interface TokenPayload {
  used: boolean;
  autoGen: boolean;
  createdAt: any;
  inviteToken?: string;
}

export function createNewToken(inviteToken?: string): { raw: string; normalized: string } {
  const raw = generateSetupToken();
  const normalized = normalizeTokenValue(raw);
  return { raw, normalized };
}

export function isTokenValid(token: string): boolean {
  return token.length >= 20;
}

export { generateSetupToken, normalizeTokenValue };
