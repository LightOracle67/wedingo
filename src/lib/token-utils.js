export const generateSetupToken = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const alphabetLen = alphabet.length;
  const maxValid = 256 - (256 % alphabetLen);
  const needed = 32;
  const bytes = new Uint8Array(needed * 2);
  crypto.getRandomValues(bytes);
  const rawToken = Array.from(bytes, (byte) => {
    if (byte < maxValid) return alphabet[byte % alphabetLen];
    return "";
  }).filter(Boolean).join("").slice(0, needed);
  return rawToken.match(/.{1,4}/g)?.join("-") ?? rawToken;
};

export const normalizeTokenValue = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

export function generateInviteToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const len = chars.length;
  const maxValid = 256 - (256 % len);
  const needed = 10;
  const bytes = new Uint8Array(needed * 2);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < bytes.length && result.length < needed; i++) {
    if (bytes[i] < maxValid) result += chars[bytes[i] % len];
  }
  return result;
}
